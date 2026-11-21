"use client"

import { useId, useState } from "react"
import type { PixelGroupInfo, PixelGroupStylePatch, PixelLayerInfo } from "@/components/canvas/PixelBoard"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy, pixelBlendLabels } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_BLEND_MODES, type PixelBlendMode } from "@/lib/pixel-blend"

export type LayerGroupApi = {
  groups: PixelGroupInfo[]
  /** New group wrapping one ungrouped layer. */
  onCreate: (layerId: string) => boolean
  onAssign: (layerId: string, groupId: string) => boolean
  onRemove: (layerId: string) => boolean
  onUngroup: (groupId: string) => boolean
  onStyle: (groupId: string, patch: PixelGroupStylePatch) => boolean
  onMove: (groupId: string, direction: 1 | -1) => boolean
}

type Props = { lang: Lang; layer: PixelLayerInfo; api: LayerGroupApi }

const NEW_VALUE = "__new__"

function GroupNameInput({
  id,
  initial,
  className,
  onCommit,
}: {
  id: string
  initial: string
  className: string
  onCommit: (value: string) => void
}) {
  const [name, setName] = useState(initial)
  return (
    <input
      id={id}
      type="text"
      value={name}
      maxLength={48}
      className={className}
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

export function LayerGroupControls({ lang, layer, api }: Props) {
  const selectId = useId()
  const nameId = useId()
  const opacityId = useId()
  const blendId = useId()
  const group = layer.group ? (api.groups.find((item) => item.id === layer.group) ?? null) : null
  const control =
    "studio-control min-w-0 flex-1 border-[3px] border-earth bg-bg px-2 text-[13px] text-fg"
  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center border-[3px] border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"

  const onSelect = (value: string) => {
    if (value === NEW_VALUE) api.onCreate(layer.id)
    else if (value === "") api.onRemove(layer.id)
    else api.onAssign(layer.id, value)
  }

  return (
    <div className="mt-3 grid gap-2.5 border-t-[3px] border-earth pt-3" role="group" aria-label={copy.pixelGroup[lang]}>
      <div className="flex items-center gap-2">
        <label className="shrink-0 text-[13px] font-medium text-fg" htmlFor={selectId}>
          {copy.pixelGroup[lang]}
        </label>
        <select
          id={selectId}
          value={group ? group.id : ""}
          className={control}
          onChange={(event) => onSelect(event.target.value)}
        >
          <option value="">{copy.pixelGroupNone[lang]}</option>
          {api.groups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          {!group ? <option value={NEW_VALUE}>{copy.pixelGroupNew[lang]}</option> : null}
        </select>
      </div>

      {group ? (
        <>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={nameId}>
              {copy.pixelGroupName[lang]}
            </label>
            {/* Remounted when the group or its stored name changes, so no sync effect is needed. */}
            <GroupNameInput
              key={`${group.id}:${group.name}`}
              id={nameId}
              initial={group.name}
              className={control}
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
            <button
              type="button"
              className="studio-control inline-flex items-center border-[3px] border-earth bg-bg px-2 text-[12px] font-medium text-fg hover:bg-soft"
              onClick={() => api.onUngroup(group.id)}
            >
              {copy.pixelGroupUngroup[lang]}
            </button>
          </div>
        </>
      ) : null}

      <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">{copy.pixelGroupHint[lang]}</p>
    </div>
  )
}
