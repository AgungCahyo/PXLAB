"use client"

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
} from "react"
import type { PixelLayerInfo, PixelLayerStylePatch } from "@/components/canvas/PixelBoard"
import {
  GroupStyleControls,
  LayerGroupActions,
  nextGroupName,
  type LayerGroupApi,
} from "@/components/creations/LayerGroupControls"
import { LayerStyleControls } from "@/components/creations/LayerStyleControls"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { canAddLayer, PIXEL_LAYER_MAX, PIXEL_TEXT_LAYER_MAX, rasterLayerCount } from "../../lib/pixel"
import { cn } from "@/lib/utils"

export type LayerPanelFeedback =
  | "added"
  | "deleted"
  | "duplicated"
  | "merged"
  | "grouped"
  | "reordered"
  | "active"
  | "locked"
  | "max"

type LayerPanelProps = {
  lang: Lang
  layers: PixelLayerInfo[]
  /** Bump after paint/undo so thumbnails refresh. */
  thumbEpoch?: number
  getThumbnail: (id: string) => string | null
  onAdd: () => boolean
  onDelete: (id: string) => boolean
  onDuplicate: (id: string) => boolean
  onMergeDown: (id: string) => boolean
  onMergeVisible: () => boolean
  onActive: (id: string) => boolean
  onVisible: (id: string, visible: boolean) => boolean
  onLocked: (id: string, locked: boolean) => boolean
  onRename: (id: string, name: string) => boolean
  onMove: (id: string, toStackIndex: number) => boolean
  onStyle: (id: string, patch: PixelLayerStylePatch) => boolean
  /** Open the text editor on a text layer. */
  onEditText?: (id: string) => boolean
  /** Turn a text layer into ordinary pixels. */
  onRasterize?: (id: string) => boolean
  groupApi: LayerGroupApi
  onFeedback?: (kind: LayerPanelFeedback) => void
}

type MenuState =
  | { kind: "layer" | "group"; id: string; x: number; y: number }
  | { kind: "more"; x: number; y: number }
  | null

type MenuItem =
  | { separator: true; key: string }
  | {
      separator?: false
      key: string
      label: string
      icon: ComponentProps<typeof PixelIcon>["name"]
      disabled?: boolean
      run: () => void
    }

function stackIndexOf(layers: PixelLayerInfo[], id: string) {
  return layers.findIndex((layer) => layer.id === id)
}

function displayLayers(layers: PixelLayerInfo[]) {
  return [...layers].reverse()
}

/** Icon with a small "+" badge: reads as "new …" without a second icon set. */
function NewIcon({ name }: { name: ComponentProps<typeof PixelIcon>["name"] }) {
  return (
    <span className="relative inline-flex">
      <PixelIcon name={name} />
      <span className="absolute -bottom-1 -right-1.5 inline-flex rounded-sm bg-[#1a1829] text-[#e8e3f8]" aria-hidden="true">
        <PixelIcon name="plus" className="h-2.5 w-2.5" />
      </span>
    </span>
  )
}

const toolbarButton =
  "relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#231f35] text-[#e8e3f8] transition-colors hover:bg-[#2d2847] disabled:opacity-35"
const rowIconButton = "inline-flex h-7 w-7 items-center justify-center rounded text-[#e8e3f8]/50 transition-colors hover:bg-white/10 hover:text-[#e8e3f8]"

export function LayerPanel({
  lang,
  layers,
  thumbEpoch = 0,
  getThumbnail,
  onAdd,
  onDelete,
  onDuplicate,
  onMergeDown,
  onMergeVisible,
  onActive,
  onVisible,
  onLocked,
  onRename,
  onMove,
  onStyle,
  onEditText,
  onRasterize,
  groupApi,
  onFeedback,
}: LayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  /** Layers picked together (Ctrl/Shift+click) to become one group. UI state only. */
  const [marked, setMarked] = useState<string[]>([])
  /** Group whose properties are shown instead of the active layer's. UI state only. */
  const [focusedGroupId, setFocusedGroupId] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement | null>(null)
  const groupRenameRef = useRef<HTMLInputElement | null>(null)
  const thumbKey = layers.map((layer) => `${layer.id}:${layer.visible}:${layer.active}`).join("|")
  const thumbVersion = `${thumbKey}|${thumbEpoch}`
  const thumbs = useMemo(() => {
    // Invalidation key: getThumbnail reads mutable canvas output, not just props.
    void thumbVersion
    const next: Record<string, string> = {}
    for (const layer of layers) {
      const url = getThumbnail(layer.id)
      if (url) next[layer.id] = url
    }
    return next
  }, [layers, getThumbnail, thumbVersion])

  useEffect(() => {
    if (editingId) renameRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (editingGroupId) {
      groupRenameRef.current?.focus()
      groupRenameRef.current?.select()
    }
  }, [editingGroupId])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("click", close)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("click", close)
      window.removeEventListener("keydown", onKey)
    }
  }, [menu])

  const activeLayer = layers.find((layer) => layer.active)
  // Only ungrouped layers can be picked, and a pick needs at least two layers to mean anything.
  const pickedIds = marked.filter((id) => layers.some((layer) => layer.id === id && !layer.group))
  const selection = pickedIds.length >= 2 ? pickedIds : []
  const focusedGroup = focusedGroupId
    ? (groupApi.groups.find((group) => group.id === focusedGroupId) ?? null)
    : null

  const runAdd = () => {
    if (!canAddLayer(layers)) {
      onFeedback?.("max")
      return
    }
    if (onAdd()) onFeedback?.("added")
  }

  const runCreateGroup = (layerIds: string[]) => {
    if (layerIds.length === 0 && !canAddLayer(layers)) {
      onFeedback?.("max")
      return
    }
    if (groupApi.onCreate(layerIds, nextGroupName(lang, groupApi.groups))) {
      setMarked([])
      onFeedback?.("grouped")
    }
  }

  const activate = (id: string) => {
    if (onActive(id)) onFeedback?.("active")
  }

  /** Plain click activates; Ctrl/Cmd+click toggles a pick; Shift+click picks the range from the active layer. */
  const selectRow = (
    event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
    layer: PixelLayerInfo,
  ) => {
    setFocusedGroupId(null)
    const anchor = activeLayer && !activeLayer.group ? activeLayer : null
    if (!layer.group && anchor && event.shiftKey) {
      const a = stackIndexOf(layers, anchor.id)
      const b = stackIndexOf(layers, layer.id)
      setMarked(
        layers
          .slice(Math.min(a, b), Math.max(a, b) + 1)
          .filter((item) => !item.group)
          .map((item) => item.id),
      )
      return
    }
    if (!layer.group && (event.ctrlKey || event.metaKey)) {
      const base = selection.length > 0 ? selection : anchor ? [anchor.id] : []
      setMarked(base.includes(layer.id) ? base.filter((id) => id !== layer.id) : [...base, layer.id])
      return
    }
    setMarked([])
    activate(layer.id)
  }

  const focusGroup = (id: string) => {
    setMarked([])
    setFocusedGroupId((current) => (current === id ? null : id))
  }

  const toggleLock = (layer: PixelLayerInfo) => {
    if (onLocked(layer.id, !layer.locked)) {
      if (!layer.locked) onFeedback?.("locked")
    }
  }

  const commitRename = (id: string, value: string) => {
    onRename(id, value)
    setEditingId(null)
  }

  const openMenu = (state: NonNullable<MenuState>) => {
    setMenu(state)
  }

  const onDragStart = (id: string) => {
    setDragId(id)
  }

  const onDragOver = (event: React.DragEvent, id: string) => {
    event.preventDefault()
    setDropId(id)
  }

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null)
      setDropId(null)
      return
    }
    const targetStack = stackIndexOf(layers, targetId)
    if (targetStack < 0) return
    if (onMove(dragId, targetStack)) onFeedback?.("reordered")
    setDragId(null)
    setDropId(null)
  }

  const menuLayer = menu?.kind === "layer" ? layers.find((layer) => layer.id === menu.id) : null
  const menuGroup = menu?.kind === "group" ? groupApi.groups.find((group) => group.id === menu.id) : null
  const menuStack = menuLayer ? stackIndexOf(layers, menuLayer.id) : -1
  // A layer can only bake into the one below when both are in the same group (or both outside one).
  const canMergeDown = menuStack > 0 && menuLayer !== null && menuLayer !== undefined && (layers[menuStack - 1]?.group ?? null) === (menuLayer.group ?? null)
  const canMergeVisible = layers.filter((layer) => layer.visible).length >= 2
  const dragLayer = dragId ? layers.find((layer) => layer.id === dragId) : undefined

  const menuItems: MenuItem[] = []
  if (menuLayer) {
    menuItems.push(
      {
        key: "duplicate",
        label: copy.pixelLayerDuplicate[lang],
        icon: "duplicate",
        disabled: !canAddLayer(layers, menuLayer.text ? "text" : "raster"),
        run: () => {
          if (onDuplicate(menuLayer.id)) onFeedback?.("duplicated")
        },
      },
      {
        key: "rename",
        label: copy.pixelLayerRename[lang],
        icon: "pencil",
        run: () => setEditingId(menuLayer.id),
      },
      ...(menuLayer.text
        ? [
            {
              key: "edit-text",
              label: copy.pixelTextEdit[lang],
              icon: "text" as const,
              run: () => void onEditText?.(menuLayer.id),
            },
            {
              key: "rasterize-text",
              label: copy.pixelTextRasterize[lang],
              icon: "square" as const,
              run: () => void onRasterize?.(menuLayer.id),
            },
          ]
        : []),
      {
        key: "merge-down",
        label: copy.pixelLayerMergeDown[lang],
        icon: "merge",
        disabled: !canMergeDown,
        run: () => {
          if (onMergeDown(menuLayer.id)) onFeedback?.("merged")
        },
      },
      { separator: true, key: "sep-group" },
    )
    if (menuLayer.group) {
      menuItems.push({
        key: "remove-from-group",
        label: copy.pixelGroupRemove[lang],
        icon: "folder",
        run: () => {
          if (groupApi.onRemove(menuLayer.id)) onFeedback?.("reordered")
        },
      })
    } else {
      menuItems.push({
        key: "group-layer",
        label: copy.pixelGroupNew[lang],
        icon: "folder",
        run: () => runCreateGroup([menuLayer.id]),
      })
    }
    for (const group of groupApi.groups) {
      if (group.id === menuLayer.group) continue
      menuItems.push({
        key: `move-to-${group.id}`,
        label: copy.pixelGroupMoveTo[lang].replace("{name}", group.name),
        icon: "folder",
        run: () => {
          if (groupApi.onAssign(menuLayer.id, group.id)) onFeedback?.("reordered")
        },
      })
    }
    menuItems.push(
      { separator: true, key: "sep-delete" },
      {
        key: "delete",
        label: copy.pixelLayerDelete[lang],
        icon: "trash",
        disabled: layers.length <= 1,
        run: () => {
          if (onDelete(menuLayer.id)) onFeedback?.("deleted")
        },
      },
    )
  } else if (menuGroup) {
    const members = layers.flatMap((layer, index) => (layer.group === menuGroup.id ? [index] : []))
    menuItems.push(
      {
        key: "rename-group",
        label: copy.pixelLayerRename[lang],
        icon: "pencil",
        run: () => setEditingGroupId(menuGroup.id),
      },
      {
        key: "group-up",
        label: copy.pixelGroupMoveUp[lang],
        icon: "publish",
        disabled: members.length === 0 || Math.max(...members) >= layers.length - 1,
        run: () => {
          if (groupApi.onMove(menuGroup.id, 1)) onFeedback?.("reordered")
        },
      },
      {
        key: "group-down",
        label: copy.pixelGroupMoveDown[lang],
        icon: "download",
        disabled: members.length === 0 || Math.min(...members) <= 0,
        run: () => {
          if (groupApi.onMove(menuGroup.id, -1)) onFeedback?.("reordered")
        },
      },
      { separator: true, key: "sep-ungroup" },
      {
        key: "ungroup",
        label: copy.pixelGroupUngroup[lang],
        icon: "close",
        run: () => {
          if (groupApi.onUngroup(menuGroup.id)) onFeedback?.("reordered")
        },
      },
    )
  } else if (menu?.kind === "more") {
    menuItems.push({
      key: "merge-visible",
      label: copy.pixelLayerMergeVisible[lang],
      icon: "merge",
      disabled: !canMergeVisible,
      run: () => {
        if (onMergeVisible()) onFeedback?.("merged")
      },
    })
    if (groupApi.groups.length > 0) {
      menuItems.push(
        { separator: true, key: "sep-groups" },
        {
          key: "expand-all",
          label: copy.pixelGroupExpandAll[lang],
          icon: "plus",
          disabled: !groupApi.groups.some((group) => group.collapsed),
          run: () => {
            for (const group of groupApi.groups) groupApi.onStyle(group.id, { collapsed: false })
          },
        },
        {
          key: "collapse-all",
          label: copy.pixelGroupCollapseAll[lang],
          icon: "minus",
          disabled: groupApi.groups.every((group) => group.collapsed),
          run: () => {
            for (const group of groupApi.groups) groupApi.onStyle(group.id, { collapsed: true })
          },
        },
      )
    }
  }

  const createLabel =
    selection.length > 0
      ? copy.pixelGroupCreateFromN[lang].replace("{n}", String(selection.length))
      : !canAddLayer(layers)
        ? copy.pixelLayerMax[lang]
        : copy.pixelGroupCreateTip[lang]

  return (
    <section className="border-b border-white/[0.08] px-3 py-3" aria-label={copy.pixelLayers[lang]}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#e8e3f8]/80">
          <PixelIcon name="layers" className="text-[#e8e3f8]/55" />
          <span className="sr-only">{copy.pixelLayers[lang]}</span>
          <span className="text-[11px] font-normal normal-case tracking-normal tabular-nums text-[#e8e3f8]/50" aria-hidden="true">
            {rasterLayerCount(layers)}/{PIXEL_LAYER_MAX}
            {layers.length > rasterLayerCount(layers)
              ? ` + ${layers.length - rasterLayerCount(layers)}/${PIXEL_TEXT_LAYER_MAX} T`
              : ""}
          </span>
        </h3>
        <div className="flex items-center gap-1" role="toolbar" aria-label={copy.pixelLayers[lang]}>
          <button
            type="button"
            className={toolbarButton}
            aria-label={copy.pixelLayerAdd[lang]}
            title={copy.pixelLayerAdd[lang]}
            disabled={!canAddLayer(layers)}
            onClick={runAdd}
          >
            <PixelIcon name="plus" />
          </button>
          <button
            type="button"
            className={toolbarButton}
            aria-label={createLabel}
            title={createLabel}
            disabled={selection.length === 0 && !canAddLayer(layers)}
            onClick={() => runCreateGroup(selection)}
          >
            <NewIcon name="folder" />
            {selection.length > 0 ? (
              <span
                className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-[#8b5cf6] px-1 text-center text-[10px] font-medium leading-4 text-white"
                aria-hidden="true"
              >
                {selection.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={toolbarButton}
            aria-label={copy.pixelLayersMore[lang]}
            title={copy.pixelLayersMore[lang]}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === "more"}
            onClick={(event) => {
              event.stopPropagation()
              const rect = event.currentTarget.getBoundingClientRect()
              openMenu({ kind: "more", x: rect.left, y: rect.bottom })
            }}
          >
            <PixelIcon name="more" />
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5">
        {displayLayers(layers).map((layer, displayIndex, list) => {
          const group = layer.group ? groupApi.groups.find((item) => item.id === layer.group) : undefined
          const startsGroup = Boolean(group) && list[displayIndex - 1]?.group !== layer.group
          const endsGroup = Boolean(group) && list[displayIndex + 1]?.group !== layer.group
          if (group && group.collapsed && !startsGroup) return null
          const hidden = !layer.visible || Boolean(group && (!group.visible || group.opacity === 0))
          const isDrop = dropId === layer.id && dragId !== layer.id
          const isPicked = selection.includes(layer.id)
          return (
            <Fragment key={layer.id}>
              {group && startsGroup ? (
                <li
                  className={cn(
                    "flex items-center gap-1 rounded-lg border border-white/10 bg-[#231f35] px-1.5 py-1 transition-colors",
                    focusedGroup?.id === group.id && "border-[#8b5cf6]/70 bg-[#2d2847]",
                    !group.visible && "opacity-50",
                    dragId !== null && dropId === `group:${group.id}` && "border-dashed border-[#a78bfa] bg-[#2d2847]",
                  )}
                  aria-label={`${copy.pixelGroup[lang]}: ${group.name}`}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    openMenu({ kind: "group", id: group.id, x: event.clientX, y: event.clientY })
                  }}
                  onDragOver={(event) => {
                    if (!dragId) return
                    event.preventDefault()
                    setDropId(`group:${group.id}`)
                  }}
                  onDragLeave={() => setDropId((current) => (current === `group:${group.id}` ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault()
                    const moving = dragId
                    setDragId(null)
                    setDropId(null)
                    if (moving && groupApi.onAssign(moving, group.id)) onFeedback?.("reordered")
                  }}
                >
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded text-[#e8e3f8]/70 hover:bg-white/10 hover:text-[#e8e3f8]"
                    aria-expanded={!group.collapsed}
                    aria-label={group.collapsed ? copy.pixelGroupExpand[lang] : copy.pixelGroupCollapse[lang]}
                    title={group.collapsed ? copy.pixelGroupExpand[lang] : copy.pixelGroupCollapse[lang]}
                    onClick={() => groupApi.onStyle(group.id, { collapsed: !group.collapsed })}
                  >
                    <PixelIcon name={group.collapsed ? "plus" : "minus"} />
                  </button>
                  <PixelIcon name="folder" className="shrink-0 text-[#a78bfa]" />
                  {editingGroupId === group.id ? (
                    <input
                      ref={groupRenameRef}
                      type="text"
                      defaultValue={group.name}
                      maxLength={48}
                      aria-label={copy.pixelGroupName[lang]}
                      className="h-7 min-w-0 flex-1 rounded border border-[#8b5cf6] bg-[#1a1829] px-1.5 text-[12px] text-[#e8e3f8]"
                      onBlur={(event) => {
                        groupApi.onStyle(group.id, { name: event.target.value })
                        setEditingGroupId(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur()
                        if (event.key === "Escape") setEditingGroupId(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[12px] font-medium text-[#e8e3f8]"
                      title={group.name}
                      aria-pressed={focusedGroup?.id === group.id}
                      onClick={() => focusGroup(group.id)}
                      onDoubleClick={() => setEditingGroupId(group.id)}
                    >
                      {group.name}
                    </button>
                  )}
                  <span className="shrink-0 text-[11px] tabular-nums text-[#e8e3f8]/45" aria-hidden="true">
                    {layers.filter((item) => item.group === group.id).length}
                  </span>
                  <button
                    type="button"
                    className={rowIconButton}
                    aria-label={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
                    title={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
                    onClick={() => groupApi.onStyle(group.id, { visible: !group.visible })}
                  >
                    <PixelIcon name={group.visible ? "eye" : "eyeOff"} />
                  </button>
                  <button
                    type="button"
                    className={rowIconButton}
                    aria-label={copy.pixelGroup[lang]}
                    title={copy.pixelGroup[lang]}
                    aria-haspopup="menu"
                    onClick={(event) => {
                      event.stopPropagation()
                      openMenu({ kind: "group", id: group.id, x: event.clientX, y: event.clientY })
                    }}
                  >
                    <PixelIcon name="more" />
                  </button>
                </li>
              ) : null}
              <li
                draggable
                onDragStart={() => onDragStart(layer.id)}
                onDragOver={(event) => onDragOver(event, layer.id)}
                onDragEnd={() => {
                  setDragId(null)
                  setDropId(null)
                }}
                onDrop={() => onDrop(layer.id)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  openMenu({ kind: "layer", id: layer.id, x: event.clientX, y: event.clientY })
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition-colors",
                  group && "ml-4",
                  layer.active
                    ? "border-[#8b5cf6]/70 bg-[#8b5cf6]/15"
                    : isPicked
                      ? "border-sky-400/70 bg-[#231f35]"
                      : "border-white/[0.08] bg-[#231f35]/70 hover:bg-[#231f35]",
                  isPicked && "shadow-[inset_3px_0_0_0_#38bdf8]",
                  hidden && "opacity-45",
                  isDrop && "border-dashed border-[#a78bfa]",
                  dragId === layer.id && "opacity-65",
                )}
              >
                <span
                  className="inline-flex h-7 w-4 cursor-grab items-center justify-center text-[#e8e3f8]/35 active:cursor-grabbing"
                  aria-label={copy.pixelLayerReorder[lang]}
                  title={copy.pixelLayerReorder[lang]}
                >
                  <PixelIcon name="grip" />
                </span>

                <button
                  type="button"
                  className="relative h-9 w-9 shrink-0 overflow-hidden rounded border border-white/15 bg-[length:8px_8px] bg-[linear-gradient(45deg,#2a2640_25%,transparent_25%,transparent_75%,#2a2640_75%),linear-gradient(45deg,#2a2640_25%,transparent_25%,transparent_75%,#2a2640_75%)] bg-[position:0_0,4px_4px]"
                  aria-label={layer.active ? copy.pixelLayerActive[lang] : layer.name}
                  onClick={(event) => selectRow(event, layer)}
                >
                  {thumbs[layer.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbs[layer.id]}
                      alt=""
                      className="h-full w-full object-contain [image-rendering:pixelated]"
                      draggable={false}
                    />
                  ) : null}
                </button>

                <div className="min-w-0 flex-1">
                  {editingId === layer.id ? (
                    <input
                      ref={renameRef}
                      type="text"
                      defaultValue={layer.name}
                      aria-label={copy.pixelLayerRename[lang]}
                      className="h-7 w-full rounded border border-[#8b5cf6] bg-[#1a1829] px-1.5 text-[12px] text-[#e8e3f8]"
                      onBlur={(event) => commitRename(layer.id, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur()
                        if (event.key === "Escape") setEditingId(null)
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "block w-full truncate text-left text-[12px] font-medium",
                        layer.active ? "text-white" : "text-[#e8e3f8]/85",
                      )}
                      onClick={(event) => selectRow(event, layer)}
                      onDoubleClick={() => (layer.text && onEditText ? onEditText(layer.id) : setEditingId(layer.id))}
                    >
                      {layer.name}
                      {isPicked ? <span className="sr-only"> — {copy.pixelLayerSelected[lang]}</span> : null}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className={rowIconButton}
                  aria-label={hidden ? copy.pixelLayerShow[lang] : copy.pixelLayerHide[lang]}
                  title={hidden ? copy.pixelLayerShow[lang] : copy.pixelLayerHide[lang]}
                  onClick={() => onVisible(layer.id, !layer.visible)}
                >
                  <PixelIcon name={hidden ? "eyeOff" : "eye"} />
                </button>
                <button
                  type="button"
                  className={rowIconButton}
                  aria-label={layer.locked ? copy.pixelLayerUnlock[lang] : copy.pixelLayerLock[lang]}
                  title={layer.locked ? copy.pixelLayerUnlock[lang] : copy.pixelLayerLock[lang]}
                  onClick={() => toggleLock(layer)}
                >
                  <PixelIcon name={layer.locked ? "lock" : "unlock"} />
                </button>
                <button
                  type="button"
                  className={rowIconButton}
                  aria-label={copy.pixelLayerMore[lang]}
                  title={copy.pixelLayerMore[lang]}
                  aria-haspopup="menu"
                  onClick={(event) => {
                    event.stopPropagation()
                    openMenu({ kind: "layer", id: layer.id, x: event.clientX, y: event.clientY })
                  }}
                >
                  <PixelIcon name="more" />
                </button>
              </li>
              {group && endsGroup && dragLayer?.group === group.id ? (
                <li
                  className={cn(
                    "ml-4 rounded-lg border border-dashed border-white/20 px-2 py-1.5 text-center text-[length:var(--studio-meta,0.75rem)] text-[#e8e3f8]/50",
                    dropId === `out:${group.id}` && "border-[#a78bfa] bg-[#231f35] text-[#e8e3f8]",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDropId(`out:${group.id}`)
                  }}
                  onDragLeave={() => setDropId((current) => (current === `out:${group.id}` ? null : current))}
                  onDrop={(event) => {
                    event.preventDefault()
                    const moving = dragId
                    setDragId(null)
                    setDropId(null)
                    if (moving && groupApi.onRemove(moving)) onFeedback?.("reordered")
                  }}
                >
                  {copy.pixelGroupDropOut[lang]}
                </li>
              ) : null}
            </Fragment>
          )
        })}
      </ul>

      {focusedGroup ? (
        <GroupStyleControls lang={lang} group={focusedGroup} api={groupApi} />
      ) : activeLayer ? (
        <LayerStyleControls
          lang={lang}
          layer={activeLayer}
          isBase={stackIndexOf(layers, activeLayer.id) === 0}
          onStyle={onStyle}
        />
      ) : null}

      {menu && menuItems.length > 0 ? (
        <div
          role="menu"
          className="fixed z-[80] max-h-[min(24rem,calc(100vh-1rem))] min-w-[12.5rem] overflow-y-auto rounded-xl border border-white/10 bg-[#1a1829] py-1.5 shadow-2xl backdrop-blur-md"
          style={{
            left: Math.max(8, Math.min(menu.x, window.innerWidth - 220)),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - 260)),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {menuItems.map((item) =>
            item.separator ? (
              <div key={item.key} role="separator" className="my-1 h-px bg-white/10" />
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#e8e3f8] transition-colors hover:bg-white/10 disabled:opacity-35"
                onClick={() => {
                  item.run()
                  setMenu(null)
                }}
              >
                <PixelIcon name={item.icon} className="shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </section>
  )
}

export function LayerMobileStrip({
  lang,
  layers,
  thumbEpoch = 0,
  getThumbnail,
  onAdd,
  onCreateGroup,
  onActive,
  onFeedback,
  onOpenSheet,
}: {
  lang: Lang
  layers: PixelLayerInfo[]
  thumbEpoch?: number
  getThumbnail: (id: string) => string | null
  onAdd: () => boolean
  /** New group holding a blank layer (the mobile strip has no multi-select). */
  onCreateGroup: () => boolean
  onActive: (id: string) => boolean
  onFeedback?: (kind: LayerPanelFeedback) => void
  onOpenSheet: (id: string) => void
}) {
  const longPressRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const thumbKey = layers.map((layer) => layer.id).join("|")
  const thumbVersion = `${thumbKey}|${thumbEpoch}`
  const thumbs = useMemo(() => {
    void thumbVersion
    const next: Record<string, string> = {}
    for (const layer of layers) {
      const url = getThumbnail(layer.id)
      if (url) next[layer.id] = url
    }
    return next
  }, [layers, getThumbnail, thumbVersion])

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current = null
    }
  }

  useEffect(
    () => () => {
      if (longPressRef.current) clearTimeout(longPressRef.current.timer)
    },
    [],
  )

  const startLongPress = (id: string) => {
    clearLongPress()
    longPressRef.current = {
      id,
      timer: setTimeout(() => {
        longPressRef.current = null
        onOpenSheet(id)
      }, 420),
    }
  }

  return (
    <div className="studio-row w-full overflow-x-auto pb-0.5" aria-label={copy.pixelLayers[lang]}>
      <button
        type="button"
        className="studio-thumb s-btn inline-flex items-center justify-center border-transparent"
        aria-label={copy.pixelLayerAdd[lang]}
        onClick={() => {
          if (!canAddLayer(layers)) {
            onFeedback?.("max")
            return
          }
          if (onAdd()) onFeedback?.("added")
        }}
      >
        <PixelIcon name="plus" />
      </button>
      <button
        type="button"
        className="studio-thumb s-btn inline-flex items-center justify-center border-transparent"
        aria-label={copy.pixelGroupCreate[lang]}
        title={copy.pixelGroupCreateTip[lang]}
        onClick={() => {
          if (!canAddLayer(layers)) {
            onFeedback?.("max")
            return
          }
          if (onCreateGroup()) onFeedback?.("grouped")
        }}
      >
        <NewIcon name="folder" />
      </button>
      {displayLayers(layers).map((layer) => (
        <Fragment key={layer.id}>
          <button
            type="button"
            className={cn(
              "studio-thumb relative inline-flex items-center justify-center rounded-md border",
              layer.active ? "border-[#8b5cf6] bg-[#8b5cf6]/20" : "border-white/10 bg-[#231f35]",
              !layer.visible && "opacity-45",
            )}
            aria-label={layer.name}
            aria-current={layer.active ? "true" : undefined}
            onPointerDown={() => startLongPress(layer.id)}
            onPointerUp={(event: ReactPointerEvent<HTMLButtonElement>) => {
              const wasLong = !longPressRef.current
              clearLongPress()
              if (!wasLong && event.button === 0) {
                if (onActive(layer.id)) onFeedback?.("active")
              }
            }}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
            onContextMenu={(event) => {
              event.preventDefault()
              clearLongPress()
              onOpenSheet(layer.id)
            }}
          >
            {thumbs[layer.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbs[layer.id]}
                alt=""
                className="h-full w-full object-contain [image-rendering:pixelated]"
                draggable={false}
              />
            ) : (
              <PixelIcon name="layers" className="text-[#e8e3f8]/60" />
            )}
            {layer.locked ? (
              <span className="absolute bottom-0 right-0 rounded-tl bg-[#1a1829]/90 p-0.5 text-[#e8e3f8]">
                <PixelIcon name="lock" className="h-3 w-3" />
              </span>
            ) : null}
          </button>
          {layer.active ? (
            <button
              type="button"
              className="studio-thumb s-btn inline-flex items-center justify-center border-transparent"
              aria-label={`${layer.name} — ${copy.pixelLayerMore[lang]}`}
              onClick={() => onOpenSheet(layer.id)}
            >
              <PixelIcon name="more" />
            </button>
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

export function LayerMobileSheet({
  lang,
  open,
  layerId,
  layers,
  onClose,
  getThumbnail,
  onDelete,
  onDuplicate,
  onMergeDown,
  onMergeVisible,
  onVisible,
  onLocked,
  onRename,
  onMove,
  onStyle,
  groupApi,
  onFeedback,
}: {
  lang: Lang
  open: boolean
  layerId: string | null
  layers: PixelLayerInfo[]
  onClose: () => void
  getThumbnail: (id: string) => string | null
  onDelete: (id: string) => boolean
  onDuplicate: (id: string) => boolean
  onMergeDown: (id: string) => boolean
  onMergeVisible: () => boolean
  onVisible: (id: string, visible: boolean) => boolean
  onLocked: (id: string, locked: boolean) => boolean
  onRename: (id: string, name: string) => boolean
  onMove: (id: string, toStackIndex: number) => boolean
  onStyle: (id: string, patch: PixelLayerStylePatch) => boolean
  groupApi: LayerGroupApi
  onFeedback?: (kind: LayerPanelFeedback) => void
}) {
  const layer = layerId ? layers.find((item) => item.id === layerId) : null
  const stack = layer ? stackIndexOf(layers, layer.id) : -1
  const thumb = layer ? getThumbnail(layer.id) : null
  const sheetGroup = layer?.group ? (groupApi.groups.find((item) => item.id === layer.group) ?? null) : null
  const sourceName = layer?.name ?? ""
  const [draft, setDraft] = useState({
    id: layer?.id ?? null,
    source: sourceName,
    value: sourceName,
  })
  const name = draft.id === (layer?.id ?? null) && draft.source === sourceName ? draft.value : sourceName

  if (!layer) {
    return (
      <Dialog open={open} onClose={onClose} title={copy.pixelLayers[lang]} closeLabel={copy.closeMenu[lang]}>
        <p className="sr-only">{copy.pixelLayers[lang]}</p>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.pixelLayerMore[lang]}
      closeLabel={copy.closeMenu[lang]}
      className="mt-auto mb-0 w-full max-w-none rounded-none sm:m-auto sm:w-[min(calc(100%-2rem),28rem)]"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="studio-thumb rounded-xl border border-slate-200 bg-slate-50 sm:h-14 sm:w-14">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
          ) : null}
        </div>
        <input
          type="text"
          value={name}
          aria-label={copy.pixelLayerRename[lang]}
          className="studio-control min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[13px] text-fg md:text-[14px]"
          onChange={(event) =>
            setDraft({ id: layer?.id ?? null, source: sourceName, value: event.target.value })
          }
          onBlur={() => onRename(layer.id, name)}
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <IconAction
          label={layer.visible ? copy.pixelLayerHide[lang] : copy.pixelLayerShow[lang]}
          icon={layer.visible ? "eye" : "eyeOff"}
          onClick={() => onVisible(layer.id, !layer.visible)}
        />
        <IconAction
          label={layer.locked ? copy.pixelLayerUnlock[lang] : copy.pixelLayerLock[lang]}
          icon={layer.locked ? "lock" : "unlock"}
          onClick={() => {
            if (onLocked(layer.id, !layer.locked) && !layer.locked) onFeedback?.("locked")
          }}
        />
        <IconAction
          label={copy.pixelLayerMoveUp[lang]}
          icon="publish"
          disabled={stack >= layers.length - 1}
          onClick={() => {
            if (onMove(layer.id, stack + 1)) onFeedback?.("reordered")
          }}
        />
        <IconAction
          label={copy.pixelLayerMoveDown[lang]}
          icon="download"
          disabled={stack <= 0}
          onClick={() => {
            if (onMove(layer.id, stack - 1)) onFeedback?.("reordered")
          }}
        />
      </div>

      <div className="studio-row mt-2 flex-wrap">
        <button
          type="button"
          className="studio-hit rounded-xl border border-slate-200 bg-slate-50 text-fg hover:bg-slate-100 disabled:opacity-40"
          aria-label={copy.pixelLayerDuplicate[lang]}
          title={copy.pixelLayerDuplicate[lang]}
          disabled={!canAddLayer(layers, layer.text ? "text" : "raster")}
          onClick={() => {
            if (onDuplicate(layer.id)) {
              onFeedback?.("duplicated")
              onClose()
            }
          }}
        >
          <PixelIcon name="duplicate" />
        </button>
        <button
          type="button"
          className="studio-hit rounded-xl border border-slate-200 bg-slate-50 text-fg hover:bg-slate-100 disabled:opacity-40"
          aria-label={copy.pixelLayerMergeDown[lang]}
          title={copy.pixelLayerMergeDown[lang]}
          disabled={stack <= 0 || (layers[stack - 1]?.group ?? null) !== (layer.group ?? null)}
          onClick={() => {
            if (onMergeDown(layer.id)) {
              onFeedback?.("merged")
              onClose()
            }
          }}
        >
          <PixelIcon name="merge" />
        </button>
        <button
          type="button"
          className="studio-hit rounded-xl border border-slate-200 bg-slate-50 text-fg hover:bg-slate-100 disabled:opacity-40"
          aria-label={copy.pixelLayerMergeVisible[lang]}
          title={copy.pixelLayerMergeVisible[lang]}
          disabled={layers.filter((item) => item.visible).length < 2}
          onClick={() => {
            if (onMergeVisible()) {
              onFeedback?.("merged")
              onClose()
            }
          }}
        >
          <PixelIcon name="merge" />
        </button>
        <button
          type="button"
          className="studio-hit rounded-xl border border-slate-200 bg-slate-50 text-fg hover:bg-slate-100 disabled:opacity-40"
          aria-label={copy.pixelLayerDelete[lang]}
          title={copy.pixelLayerDelete[lang]}
          disabled={layers.length <= 1}
          onClick={() => {
            if (onDelete(layer.id)) {
              onFeedback?.("deleted")
              onClose()
            }
          }}
        >
          <PixelIcon name="trash" />
        </button>
      </div>

      <LayerStyleControls lang={lang} layer={layer} isBase={stack === 0} onStyle={onStyle} />
      <LayerGroupActions
        lang={lang}
        layer={layer}
        api={groupApi}
        onDone={(kind) => {
          onFeedback?.(kind)
          onClose()
        }}
      />
      {sheetGroup ? <GroupStyleControls lang={lang} group={sheetGroup} api={groupApi} showStructure /> : null}
    </Dialog>
  )
}

function IconAction({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: ComponentProps<typeof PixelIcon>["name"]
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-12 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-fg hover:bg-slate-100 disabled:opacity-40 sm:h-14"
      onClick={onClick}
    >
      <PixelIcon name={icon} />
      <span className="sr-only">{label}</span>
    </button>
  )
}
