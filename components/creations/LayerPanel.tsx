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
import { LayerGroupControls, type LayerGroupApi } from "@/components/creations/LayerGroupControls"
import { LayerStyleControls } from "@/components/creations/LayerStyleControls"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_LAYER_MAX } from "@/lib/pixel"
import { cn } from "@/lib/utils"

export type LayerPanelFeedback =
  | "added"
  | "deleted"
  | "duplicated"
  | "merged"
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
  groupApi: LayerGroupApi
  onFeedback?: (kind: LayerPanelFeedback) => void
}

type MenuState = { id: string; x: number; y: number } | null

function stackIndexOf(layers: PixelLayerInfo[], id: string) {
  return layers.findIndex((layer) => layer.id === id)
}

function displayLayers(layers: PixelLayerInfo[]) {
  return [...layers].reverse()
}

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
  groupApi,
  onFeedback,
}: LayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const renameRef = useRef<HTMLInputElement | null>(null)
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
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener("click", close)
    return () => window.removeEventListener("click", close)
  }, [menu])

  const runAdd = () => {
    if (layers.length >= PIXEL_LAYER_MAX) {
      onFeedback?.("max")
      return
    }
    if (onAdd()) onFeedback?.("added")
  }

  const activate = (id: string) => {
    if (onActive(id)) onFeedback?.("active")
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

  const openMenu = (id: string, clientX: number, clientY: number) => {
    setMenu({ id, x: clientX, y: clientY })
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

  const menuLayer = menu ? layers.find((layer) => layer.id === menu.id) : null
  const menuStack = menuLayer ? stackIndexOf(layers, menuLayer.id) : -1
  // A layer can only bake into the one below when both are in the same group (or both outside one).
  const canMergeDown = menuStack > 0 && menuLayer !== null && menuLayer !== undefined && (layers[menuStack - 1]?.group ?? null) === (menuLayer.group ?? null)
  const canMergeVisible = layers.filter((layer) => layer.visible).length >= 2

  return (
    <section className="border-b-[3px] border-earth px-3 py-3" aria-label={copy.pixelLayers[lang]}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
          <PixelIcon name="layers" />
          <span className="sr-only">{copy.pixelLayers[lang]}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border-[3px] border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"
            aria-label={copy.pixelLayerAdd[lang]}
            title={copy.pixelLayerAdd[lang]}
            disabled={layers.length >= PIXEL_LAYER_MAX}
            onClick={runAdd}
          >
            <PixelIcon name="plus" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border-[3px] border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"
            aria-label={copy.pixelLayerMergeVisible[lang]}
            title={copy.pixelLayerMergeVisible[lang]}
            disabled={!canMergeVisible}
            onClick={() => {
              if (onMergeVisible()) onFeedback?.("merged")
            }}
          >
            <PixelIcon name="merge" />
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {displayLayers(layers).map((layer, displayIndex, list) => {
          const group = layer.group ? groupApi.groups.find((item) => item.id === layer.group) : undefined
          const startsGroup = Boolean(group) && list[displayIndex - 1]?.group !== layer.group
          if (group && group.collapsed && !startsGroup) return null
          const hidden = !layer.visible || Boolean(group && (!group.visible || group.opacity === 0))
          const isDrop = dropId === layer.id && dragId !== layer.id
          return (
            <Fragment key={layer.id}>
              {group && startsGroup ? (
                <li
                  className={cn(
                    "flex items-center gap-1.5 border-[3px] border-earth bg-soft px-1.5 py-1",
                    !group.visible && "opacity-55",
                    dragId !== null && dropId === `group:${group.id}` && "border-dashed border-fg bg-card",
                  )}
                  aria-label={`${copy.pixelGroup[lang]}: ${group.name}`}
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
                    className="inline-flex h-8 w-8 items-center justify-center text-fg hover:bg-bg"
                    aria-expanded={!group.collapsed}
                    aria-label={group.collapsed ? copy.pixelGroupExpand[lang] : copy.pixelGroupCollapse[lang]}
                    title={group.collapsed ? copy.pixelGroupExpand[lang] : copy.pixelGroupCollapse[lang]}
                    onClick={() => groupApi.onStyle(group.id, { collapsed: !group.collapsed })}
                  >
                    <PixelIcon name={group.collapsed ? "plus" : "minus"} />
                  </button>
                  <PixelIcon name="folder" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{group.name}</span>
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-fg"
                    aria-label={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
                    title={group.visible ? copy.pixelLayerHide[lang] : copy.pixelGroupVisible[lang]}
                    onClick={() => groupApi.onStyle(group.id, { visible: !group.visible })}
                  >
                    <PixelIcon name={group.visible ? "eye" : "eyeOff"} />
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
                openMenu(layer.id, event.clientX, event.clientY)
              }}
              className={cn(
                "flex items-center gap-1.5 border-[3px] border-earth px-1.5 py-1.5",
                group && "ml-4",
                layer.active ? "border-fg bg-soft" : "bg-card",
                hidden && "opacity-55",
                isDrop && "border-dashed border-fg",
                dragId === layer.id && "opacity-70",
              )}
            >
              <span
                className="inline-flex h-8 w-5 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
                aria-label={copy.pixelLayerReorder[lang]}
                title={copy.pixelLayerReorder[lang]}
              >
                <PixelIcon name="grip" />
              </span>

              <button
                type="button"
                className="relative h-10 w-10 shrink-0 border-[2px] border-earth bg-[length:8px_8px] bg-[linear-gradient(45deg,#e8e4d8_25%,transparent_25%,transparent_75%,#e8e4d8_75%),linear-gradient(45deg,#e8e4d8_25%,transparent_25%,transparent_75%,#e8e4d8_75%)] bg-[position:0_0,4px_4px]"
                aria-label={layer.active ? copy.pixelLayerActive[lang] : layer.name}
                onClick={() => activate(layer.id)}
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
                    className="h-8 w-full border-[2px] border-earth bg-bg px-1.5 text-[12px] text-fg"
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
                      "block w-full truncate text-left text-[13px] font-medium",
                      layer.active ? "text-fg" : "text-fg/90",
                    )}
                    onClick={() => activate(layer.id)}
                    onDoubleClick={() => setEditingId(layer.id)}
                  >
                    {layer.name}
                  </button>
                )}
              </div>

              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-fg"
                aria-label={hidden ? copy.pixelLayerShow[lang] : copy.pixelLayerHide[lang]}
                title={hidden ? copy.pixelLayerShow[lang] : copy.pixelLayerHide[lang]}
                onClick={() => onVisible(layer.id, !layer.visible)}
              >
                <PixelIcon name={hidden ? "eyeOff" : "eye"} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-fg"
                aria-label={layer.locked ? copy.pixelLayerUnlock[lang] : copy.pixelLayerLock[lang]}
                title={layer.locked ? copy.pixelLayerUnlock[lang] : copy.pixelLayerLock[lang]}
                onClick={() => toggleLock(layer)}
              >
                <PixelIcon name={layer.locked ? "lock" : "unlock"} />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center text-muted hover:text-fg"
                aria-label={copy.pixelLayerMore[lang]}
                title={copy.pixelLayerMore[lang]}
                onClick={(event) => {
                  event.stopPropagation()
                  openMenu(layer.id, event.clientX, event.clientY)
                }}
              >
                <PixelIcon name="more" />
              </button>
            </li>
            </Fragment>
          )
        })}
      </ul>

      {(() => {
        const activeLayer = layers.find((layer) => layer.active)
        return activeLayer ? (
          <LayerStyleControls
            lang={lang}
            layer={activeLayer}
            isBase={stackIndexOf(layers, activeLayer.id) === 0}
            onStyle={onStyle}
          />
        ) : null
      })()}
      {(() => {
        const activeLayer = layers.find((layer) => layer.active)
        return activeLayer ? <LayerGroupControls lang={lang} layer={activeLayer} api={groupApi} /> : null
      })()}

      {menu && menuLayer ? (
        <div
          role="menu"
          className="fixed z-[80] min-w-[12rem] border-[3px] border-earth bg-card py-1 shadow-[4px_4px_0_0_var(--earth)]"
          style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 220) }}
          onClick={(event) => event.stopPropagation()}
        >
          {(
            [
              {
                label: copy.pixelLayerDuplicate[lang],
                icon: "duplicate" as const,
                disabled: layers.length >= PIXEL_LAYER_MAX,
                run: () => {
                  if (onDuplicate(menuLayer.id)) onFeedback?.("duplicated")
                },
              },
              {
                label: copy.pixelLayerRename[lang],
                icon: "pencil" as const,
                disabled: false,
                run: () => setEditingId(menuLayer.id),
              },
              {
                label: copy.pixelLayerMergeDown[lang],
                icon: "merge" as const,
                disabled: !canMergeDown,
                run: () => {
                  if (onMergeDown(menuLayer.id)) onFeedback?.("merged")
                },
              },
              {
                label: copy.pixelLayerDelete[lang],
                icon: "trash" as const,
                disabled: layers.length <= 1,
                run: () => {
                  if (onDelete(menuLayer.id)) onFeedback?.("deleted")
                },
              },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg hover:bg-soft disabled:opacity-40"
              onClick={() => {
                item.run()
                setMenu(null)
              }}
            >
              <PixelIcon name={item.icon} />
              {item.label}
            </button>
          ))}
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
  onActive,
  onFeedback,
  onOpenSheet,
}: {
  lang: Lang
  layers: PixelLayerInfo[]
  thumbEpoch?: number
  getThumbnail: (id: string) => string | null
  onAdd: () => boolean
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
        className="studio-thumb inline-flex items-center justify-center border-[3px] border-earth bg-bg text-fg"
        aria-label={copy.pixelLayerAdd[lang]}
        onClick={() => {
          if (layers.length >= PIXEL_LAYER_MAX) {
            onFeedback?.("max")
            return
          }
          if (onAdd()) onFeedback?.("added")
        }}
      >
        <PixelIcon name="plus" />
      </button>
      {displayLayers(layers).map((layer) => (
        <Fragment key={layer.id}>
          <button
            type="button"
            className={cn(
              "studio-thumb relative inline-flex items-center justify-center border-[3px] border-earth",
              layer.active ? "border-fg bg-soft" : "bg-card",
              !layer.visible && "opacity-50",
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
              <PixelIcon name="layers" />
            )}
            {layer.locked ? (
              <span className="absolute bottom-0 right-0 bg-card/90 p-0.5 text-fg">
                <PixelIcon name="lock" className="h-3 w-3" />
              </span>
            ) : null}
          </button>
          {layer.active ? (
            <button
              type="button"
              className="studio-thumb inline-flex items-center justify-center border-[3px] border-earth bg-card text-fg"
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
        <div className="studio-thumb border-[3px] border-earth bg-soft sm:h-14 sm:w-14">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-contain [image-rendering:pixelated]" />
          ) : null}
        </div>
        <input
          type="text"
          value={name}
          aria-label={copy.pixelLayerRename[lang]}
          className="studio-control min-w-0 flex-1 border-[3px] border-earth bg-bg px-2 text-[13px] text-fg md:text-[14px]"
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
          className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
          aria-label={copy.pixelLayerDuplicate[lang]}
          title={copy.pixelLayerDuplicate[lang]}
          disabled={layers.length >= PIXEL_LAYER_MAX}
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
          className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
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
          className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
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
          className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
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
      <LayerGroupControls lang={lang} layer={layer} api={groupApi} />
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
      className="flex h-12 flex-col items-center justify-center border-[3px] border-earth bg-bg text-fg disabled:opacity-40 sm:h-14"
      onClick={onClick}
    >
      <PixelIcon name={icon} />
      <span className="sr-only">{label}</span>
    </button>
  )
}
