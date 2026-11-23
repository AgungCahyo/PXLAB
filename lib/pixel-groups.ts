import { clampLayerOpacity, isPixelBlendMode, type PixelBlendMode } from "@/lib/pixel-blend"
import type { PixelLayerRuntime } from "@/lib/pixel"

/**
 * Layer groups: one level deep (no nesting).
 *
 * Layers stay in one flat stack; a layer joins a group through `layer.group`. Invariant: the
 * members of a group are contiguous in the stack, so a group is a run. A group composites its
 * members in isolation (into an alpha buffer) and then blends that result onto what is below
 * with the group's own opacity and blend mode, like a folder in Photoshop or Aseprite.
 *
 * Everything here mutates `layers` and `groups` in place (they are the board's runtime state)
 * and has no React or canvas dependency. This file must not import values from `pixel.ts`
 * (the compositor imports this file).
 */
export type PixelGroupRuntime = {
  id: string
  name: string
  visible: boolean
  /** 0-100. */
  opacity: number
  blend: PixelBlendMode
  /** UI only: hides the member rows in the panel. */
  collapsed: boolean
}

export type PixelGroupStylePatch = {
  name?: string
  visible?: boolean
  opacity?: number
  blend?: PixelBlendMode
  collapsed?: boolean
}

export type LayerSegment =
  | { kind: "layer"; index: number }
  | { kind: "group"; group: PixelGroupRuntime; start: number; end: number }

export function createGroupId() {
  return `group_${Math.random().toString(36).slice(2, 10)}`
}

export function groupIdOf(layer: Pick<PixelLayerRuntime, "group">): string | null {
  return layer.group ?? null
}

export function findGroup(groups: readonly PixelGroupRuntime[], id: string | null | undefined) {
  return id ? (groups.find((group) => group.id === id) ?? null) : null
}

/** Stack split into single layers and contiguous group runs, bottom to top. */
export function layerSegments(
  layers: readonly PixelLayerRuntime[],
  groups: readonly PixelGroupRuntime[] = [],
): LayerSegment[] {
  const out: LayerSegment[] = []
  let i = 0
  while (i < layers.length) {
    const group = findGroup(groups, layers[i]!.group)
    if (!group) {
      out.push({ kind: "layer", index: i })
      i += 1
      continue
    }
    let end = i
    while (end + 1 < layers.length && layers[end + 1]!.group === group.id) end += 1
    out.push({ kind: "group", group, start: i, end })
    i = end + 1
  }
  return out
}

/** Whether a layer is hidden by its own flag or because its group is hidden / fully transparent. */
export function layerEffectivelyHidden(
  layer: PixelLayerRuntime,
  groups: readonly PixelGroupRuntime[],
) {
  if (!layer.visible) return true
  const group = findGroup(groups, layer.group)
  return Boolean(group && (!group.visible || group.opacity <= 0))
}

export function clampGroupName(name: string) {
  return name.trim().slice(0, 48)
}

export function cloneGroups(groups: readonly PixelGroupRuntime[]): PixelGroupRuntime[] {
  return groups.map((group) => ({ ...group }))
}

/** True when every group's members form a single contiguous run and no layer names a missing group. */
export function isGroupLayoutValid(
  layers: readonly PixelLayerRuntime[],
  groups: readonly PixelGroupRuntime[],
) {
  const seen = new Set<string>()
  const ids = new Set(groups.map((group) => group.id))
  if (ids.size !== groups.length) return false
  let previous: string | null = null
  for (const layer of layers) {
    const id = layer.group ?? null
    if (id !== null && !ids.has(id)) return false
    if (id !== previous) {
      if (id !== null) {
        if (seen.has(id)) return false
        seen.add(id)
      }
      previous = id
    }
  }
  return groups.every((group) => seen.has(group.id))
}

/**
 * Repair a layout loaded from disk or left by an operation: drop unknown references, keep only
 * the first run of a split group (the rest become ungrouped), remove empty and duplicate groups.
 * Returns the cleaned group list; layers are updated in place.
 */
export function normalizeGroups(
  layers: PixelLayerRuntime[],
  groups: readonly PixelGroupRuntime[],
): PixelGroupRuntime[] {
  const unique: PixelGroupRuntime[] = []
  for (const group of groups) if (!unique.some((item) => item.id === group.id)) unique.push(group)
  const ids = new Set(unique.map((group) => group.id))
  const claimed = new Set<string>()
  let previous: string | null = null
  for (const layer of layers) {
    let id = layer.group ?? null
    if (id !== null && !ids.has(id)) id = null
    if (id !== null && id !== previous && claimed.has(id)) id = null
    if (id !== null) claimed.add(id)
    layer.group = id
    previous = id
  }
  return unique.filter((group) => claimed.has(group.id))
}

export function pruneEmptyGroups(
  layers: readonly PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
) {
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (!layers.some((layer) => layer.group === groups[i]!.id)) groups.splice(i, 1)
  }
}

/**
 * Move a layer inside the stack and decide its group from where it lands.
 * - between two members of the same group: it joins that group;
 * - still touching the group it already belonged to: it stays;
 * - anywhere else: it is ungrouped.
 * Contiguity is preserved by construction. Returns the final index or -1.
 */
export function moveLayerInStack(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  fromIndex: number,
  toIndex: number,
): number {
  if (fromIndex < 0 || fromIndex >= layers.length) return -1
  const to = Math.max(0, Math.min(layers.length - 1, toIndex))
  const [layer] = layers.splice(fromIndex, 1)
  if (!layer) return -1
  layers.splice(to, 0, layer)
  const below = layers[to - 1]?.group ?? null
  const above = layers[to + 1]?.group ?? null
  const previous = layer.group ?? null
  if (below !== null && below === above) layer.group = below
  else if (previous !== null && (below === previous || above === previous)) layer.group = previous
  else layer.group = null
  pruneEmptyGroups(layers, groups)
  return to
}

/**
 * New group containing the given ungrouped layers. Returns the group or null (unknown layer,
 * already grouped, or nothing given).
 *
 * The members must form one contiguous run, so the picked layers are gathered at the position of
 * the topmost one while keeping their relative order (like Photoshop). Every other layer keeps its
 * relative order and existing groups stay whole, because only ungrouped layers are ever moved.
 * Picking a contiguous range therefore never reorders anything.
 */
export function createGroupFromLayers(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  layerIds: readonly string[],
  name: string,
): PixelGroupRuntime | null {
  const wanted = new Set(layerIds)
  if (wanted.size === 0) return null
  const picked = layers.filter((layer) => wanted.has(layer.id))
  if (picked.length !== wanted.size || picked.some((layer) => layer.group)) return null
  const topId = picked[picked.length - 1]!.id
  const next: PixelLayerRuntime[] = []
  for (const layer of layers) {
    if (!wanted.has(layer.id)) next.push(layer)
    else if (layer.id === topId) next.push(...picked)
  }
  layers.splice(0, layers.length, ...next)
  const group: PixelGroupRuntime = {
    id: createGroupId(),
    name: clampGroupName(name) || "Group",
    visible: true,
    opacity: 100,
    blend: "normal",
    collapsed: false,
  }
  groups.push(group)
  for (const layer of picked) layer.group = group.id
  return group
}

/** New group containing one ungrouped layer. Returns the group or null (unknown layer / already grouped). */
export function createGroupFromLayer(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  layerId: string,
  name: string,
): PixelGroupRuntime | null {
  return createGroupFromLayers(layers, groups, [layerId], name)
}

function runOf(layers: readonly PixelLayerRuntime[], groupId: string) {
  let start = -1
  let end = -1
  layers.forEach((layer, index) => {
    if (layer.group !== groupId) return
    if (start < 0) start = index
    end = index
  })
  return start < 0 ? null : { start, end }
}

/** Put a layer into an existing group by moving it next to the group's run. */
export function assignLayerToGroup(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  layerId: string,
  groupId: string,
): boolean {
  const from = layers.findIndex((layer) => layer.id === layerId)
  if (from < 0 || !findGroup(groups, groupId)) return false
  const layer = layers[from]!
  if (layer.group === groupId) return true
  const run = runOf(layers, groupId)
  if (!run) return false
  const [removed] = layers.splice(from, 1)
  // Below the run it becomes the bottom member, above it the top member.
  const to = from < run.start ? run.start - 1 : run.end
  layers.splice(to + (from < run.start ? 0 : 1), 0, removed!)
  removed!.group = groupId
  pruneEmptyGroups(layers, groups)
  return true
}

/** Take a layer out of its group. A middle member is moved just above the group so the run stays whole. */
export function removeLayerFromGroup(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  layerId: string,
): boolean {
  const from = layers.findIndex((layer) => layer.id === layerId)
  const layer = layers[from]
  if (!layer || !layer.group) return false
  const groupId = layer.group
  const run = runOf(layers, groupId)
  if (!run) return false
  if (from === run.start || from === run.end) {
    layer.group = null
  } else {
    layers.splice(from, 1)
    layers.splice(run.end, 0, layer) // run.end - 1 after removal, +1 to sit above it
    layer.group = null
  }
  pruneEmptyGroups(layers, groups)
  return true
}

/** Dissolve a group; its layers stay where they are. */
export function ungroup(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  groupId: string,
): boolean {
  const index = groups.findIndex((group) => group.id === groupId)
  if (index < 0) return false
  for (const layer of layers) if (layer.group === groupId) layer.group = null
  groups.splice(index, 1)
  return true
}

/** Swap a whole group with the single layer or group directly above (+1) or below (-1). */
export function moveGroup(
  layers: PixelLayerRuntime[],
  groups: PixelGroupRuntime[],
  groupId: string,
  direction: 1 | -1,
): boolean {
  const segments = layerSegments(layers, groups)
  const at = segments.findIndex((segment) => segment.kind === "group" && segment.group.id === groupId)
  const other = at + direction
  if (at < 0 || other < 0 || other >= segments.length) return false
  const pieces = segments.map((segment) =>
    segment.kind === "layer"
      ? [layers[segment.index]!]
      : layers.slice(segment.start, segment.end + 1),
  )
  ;[pieces[at], pieces[other]] = [pieces[other]!, pieces[at]!]
  layers.splice(0, layers.length, ...pieces.flat())
  return true
}

export function updateGroupStyle(group: PixelGroupRuntime, patch: PixelGroupStylePatch): boolean {
  let changed = false
  if (patch.name !== undefined) {
    const name = clampGroupName(patch.name)
    if (name && name !== group.name) {
      group.name = name
      changed = true
    }
  }
  if (patch.visible !== undefined && patch.visible !== group.visible) {
    group.visible = patch.visible
    changed = true
  }
  if (patch.opacity !== undefined) {
    const opacity = clampLayerOpacity(patch.opacity)
    if (opacity !== group.opacity) {
      group.opacity = opacity
      changed = true
    }
  }
  if (patch.blend !== undefined && isPixelBlendMode(patch.blend) && patch.blend !== group.blend) {
    group.blend = patch.blend
    changed = true
  }
  if (patch.collapsed !== undefined && patch.collapsed !== group.collapsed) {
    group.collapsed = patch.collapsed
    changed = true
  }
  return changed
}
