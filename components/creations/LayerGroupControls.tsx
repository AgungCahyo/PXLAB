"use client"

import { useId, useState } from "react"
import type { PixelGroupInfo, PixelGroupStylePatch, PixelLayerInfo } from "@/components/canvas/PixelBoard"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy, pixelBlendLabels } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_BLEND_MODES, type PixelBlendMode } from "@/lib/pixel-blend"

export type LayerGroupApi = {
  groups: PixelGroupInfo[]
  /**
   * One undo step. With layer ids: a new group holding those ungrouped layers.
   * With none: a new group holding a fresh blank layer.
   */
  onCreate: (layerIds: string[], name?: string) => boolean
  onAssign: (layerId: string, groupId: string) => boolean
  onRemove: (layerId: string) => boolean
  onUngroup: (groupId: string) => boolean
  onStyle: (groupId: string, patch: PixelGroupStylePatch) => boolean
  onMove: (groupId: string, direction: 1 | -1) => boolean
}

/** "Group 1", "Group 2", ... the first name not used by an existing group. */
export function nextGroupName(lang: Lang, groups: readonly PixelGroupInfo[]) {
  const used = new Set(groups.map((group) => group.name))
  for (let n = 1; ; n += 1) {
    const name = `${copy.pixelGroup[lang]} ${n}`
    if (!used.has(name)) return name
  }
}

const control =
  "studio-control min-w-0 flex-1 border-[3px] border-earth bg-bg px-2 text-[13px] text-fg"
const iconButton =
  "inline-flex h-9 w-9 items-center justify-center border-[3px] border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"
const textButton =
  "studio-control inline-flex max-w-full items-center gap-1.5 border-[3px] border-earth bg-bg px-2 text-[12px] font-medium text-fg hover:bg-soft disabled:opacity-40"

function GroupNameInput({
  id,
  initial,
  onCommit,
}: {
  id: string
  initial: string
  onCommit: (value: string) => void
}) {
  const [name, setName] = useState(initial)
  return (
    <input
      id={id}
      type="text"
      value={name}
      maxLength={48}
      className={control}
      onChange={(event) => setName(event.target.value)}
      onBlur={() => {
        const value = name.trim()
        if (value && value !== initial) onCommit(value)
        else setName(initial)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          setName(initial)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

/**
 * Visual properties of a group (opacity and blend), the group-level twin of `LayerStyleControls`.
 * Structure (create, move, ungroup, rename) lives in the layer list and its menus, not here;
 * `showStructure` adds those controls for the mobile sheet, which has no group rows.
 */
export function GroupStyleControls({
  lang,
  group,
  api,
  showStructure = false,
}: {
  lang: Lang
  group: PixelGroupInfo
  api: LayerGroupApi
  showStructure?: boolean
}) {
  const nameId = useId()
  const opacityId = useId()
  const blendId = useId()
  return (
    <div
      className="mt-3 grid gap-2.5 border-t-[3px] border-earth pt-3"
      role="group"
      aria-label={copy.pixelGroupProperties[lang]}
    >
      {showStructure ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={nameId}>
            {copy.pixelGroupName[lang]}
          </label>
          {/* Remounted when the group or its stored name changes, so no sync effect is needed. */}
          <GroupNameInput
            key={`${group.id}:${group.name}`}
            id={nameId}
            initial={group.name}
            onCommit={(value) => api.onStyle(group.id, { name: value })}
          />
          <button
            type="button"
            className={iconButton}
            aria-label={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
            title={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
            onClick={() => api.onStyle(group.id, { visible: !group.visible })}
          >
            <PixelIcon name={group.visible ? "eye" : "eyeOff"} />
          </button>
        </div>
      ) : (
        <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-fg">
          <PixelIcon name="folder" className="shrink-0" />
          <span className="sr-only">{copy.pixelGroupProperties[lang]}: </span>
          <span className="truncate" title={group.name}>
            {group.name}
          </span>
        </p>
      )}

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1 text-[13px] font-medium text-fg" htmlFor={opacityId}>
            {copy.pixelGroupOpacity[lang]}
          </label>
          <span className="w-12 text-right text-[13px] tabular-nums text-fg">{group.opacity}%</span>
        </div>
        <input
          id={opacityId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={group.opacity}
          className="w-full"
          onChange={(event) => api.onStyle(group.id, { opacity: Number(event.target.value) })}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[13px] font-medium text-fg" htmlFor={blendId}>
          {copy.pixelGroupBlend[lang]}
        </label>
        <select
          id={blendId}
          value={group.blend}
          className={control}
          onChange={(event) => api.onStyle(group.id, { blend: event.target.value as PixelBlendMode })}
        >
          {PIXEL_BLEND_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {pixelBlendLabels[mode][lang]}
            </option>
          ))}
        </select>
      </div>

      {showStructure ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={iconButton}
            aria-label={copy.pixelGroupMoveUp[lang]}
            title={copy.pixelGroupMoveUp[lang]}
            onClick={() => api.onMove(group.id, 1)}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">↑</span>
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={copy.pixelGroupMoveDown[lang]}
            title={copy.pixelGroupMoveDown[lang]}
            onClick={() => api.onMove(group.id, -1)}
          >
            <span aria-hidden="true" className="text-[15px] leading-none">↓</span>
          </button>
          <button type="button" className={textButton} onClick={() => api.onUngroup(group.id)}>
            {copy.pixelGroupUngroup[lang]}
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Structural actions for one layer without a drag handle: wrap it in a new group, leave its group,
 * or jump to another group. Used by the mobile sheet, where there is no drag and drop.
 */
export function LayerGroupActions({
  lang,
  layer,
  api,
  onDone,
}: {
  lang: Lang
  layer: PixelLayerInfo
  api: LayerGroupApi
  onDone?: (kind: "grouped" | "reordered") => void
}) {
  const others = api.groups.filter((group) => group.id !== layer.group)
  const run = (ok: boolean, kind: "grouped" | "reordered") => {
    if (ok) onDone?.(kind)
  }
  return (
    <div className="mt-3 grid gap-2 border-t-[3px] border-earth pt-3" role="group" aria-label={copy.pixelGroup[lang]}>
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
        <PixelIcon name="folder" />
        {copy.pixelGroup[lang]}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {layer.group ? (
          <button type="button" className={textButton} onClick={() => run(api.onRemove(layer.id), "reordered")}>
            {copy.pixelGroupRemove[lang]}
          </button>
        ) : (
          <button
            type="button"
            className={textButton}
            onClick={() => run(api.onCreate([layer.id], nextGroupName(lang, api.groups)), "grouped")}
          >
            {copy.pixelGroupNew[lang]}
          </button>
        )}
        {others.map((group) => {
          const label = copy.pixelGroupMoveTo[lang].replace("{name}", group.name)
          return (
            <button
              key={group.id}
              type="button"
              className={textButton}
              title={label}
              onClick={() => run(api.onAssign(layer.id, group.id), "reordered")}
            >
              <PixelIcon name="folder" className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
