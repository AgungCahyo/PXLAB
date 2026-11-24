"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react"
import type { PixelBoardHandle } from "@/components/canvas/PixelBoard"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"

const MINI_W = 128
const MINI_H = 128

export type StudioMinimapHandle = {
  sync: () => void
}

export const StudioMinimap = forwardRef<
  StudioMinimapHandle,
  {
    lang: Lang
    boardRef: RefObject<PixelBoardHandle | null>
    hidden?: boolean
  }
>(function StudioMinimap({ lang, boardRef, hidden }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const sync = useCallback(() => {
    if (collapsed || hidden) return
    const canvas = canvasRef.current
    const board = boardRef.current
    if (!canvas || !board) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const snap = board.getViewSnapshot()
    if (snap.canvasWidth < 1 || snap.canvasHeight < 1 || snap.scale <= 0) return
    board.drawPreview(ctx, MINI_W, MINI_H)
    const miniScale = Math.min(MINI_W / snap.canvasWidth, MINI_H / snap.canvasHeight)
    const dw = snap.canvasWidth * miniScale
    const dh = snap.canvasHeight * miniScale
    const ox = (MINI_W - dw) / 2
    const oy = (MINI_H - dh) / 2
    const vx = ox + (-snap.originX / snap.scale) * miniScale
    const vy = oy + (-snap.originY / snap.scale) * miniScale
    const vw = (snap.viewWidth / snap.scale) * miniScale
    const vh = (snap.viewHeight / snap.scale) * miniScale
    ctx.save()
    ctx.strokeStyle = "#20202A"
    ctx.lineWidth = 2
    ctx.strokeRect(vx + 0.5, vy + 0.5, Math.max(2, vw), Math.max(2, vh))
    ctx.strokeStyle = "#FFFDF7"
    ctx.lineWidth = 1
    ctx.strokeRect(vx + 1.5, vy + 1.5, Math.max(1, vw - 2), Math.max(1, vh - 2))
    ctx.restore()
  }, [boardRef, collapsed, hidden])

  useImperativeHandle(ref, () => ({ sync }), [sync])

  useEffect(() => {
    sync()
  }, [sync])

  const panFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const board = boardRef.current
    const canvas = canvasRef.current
    if (!board || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = ((event.clientX - rect.left) / rect.width) * MINI_W
    const my = ((event.clientY - rect.top) / rect.height) * MINI_H
    const snap = board.getViewSnapshot()
    if (snap.canvasWidth < 1 || snap.canvasHeight < 1) return
    const miniScale = Math.min(MINI_W / snap.canvasWidth, MINI_H / snap.canvasHeight)
    const ox = (MINI_W - snap.canvasWidth * miniScale) / 2
    const oy = (MINI_H - snap.canvasHeight * miniScale) / 2
    board.centerOnCell((mx - ox) / miniScale, (my - oy) / miniScale)
  }

  if (hidden) return null

  return (
    <div className="studio-minimap pointer-events-auto absolute bottom-2 right-2 z-10 hidden md:block">
      <button
        type="button"
        className="studio-hit-sm mb-1 ml-auto flex border-earth bg-card text-fg"
        aria-expanded={!collapsed}
        aria-label={collapsed ? copy.pixelMinimapShow[lang] : copy.pixelMinimapHide[lang]}
        title={collapsed ? copy.pixelMinimapShow[lang] : copy.pixelMinimapHide[lang]}
        onClick={() => setCollapsed((value) => !value)}
      >
        <PixelIcon name="frame" />
      </button>
      {collapsed ? null : (
        <canvas
          ref={canvasRef}
          width={MINI_W}
          height={MINI_H}
          aria-label={copy.pixelMinimap[lang]}
          className="block cursor-pointer border-[3px] border-earth bg-soft"
          style={{ width: MINI_W, height: MINI_H, imageRendering: "pixelated" }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            panFromEvent(event)
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
            panFromEvent(event)
          }}
        />
      )}
    </div>
  )
})
