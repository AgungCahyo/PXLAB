"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const GRID = 24
const SWATCHES = [
  { id: "brick", color: "#e94b3c" },
  { id: "sky", color: "#59bceb" },
  { id: "grass", color: "#45a849" },
  { id: "coin", color: "#ffd447" },
  { id: "fg", color: "#282b35" },
  { id: "erase", color: "#fffdf7" },
] as const

type SwatchId = (typeof SWATCHES)[number]["id"]

function paintCell(
  ctx: CanvasRenderingContext2D,
  cells: Uint8Array,
  x: number,
  y: number,
  colorIndex: number,
) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return
  const i = y * GRID + x
  if (cells[i] === colorIndex) return
  cells[i] = colorIndex
  ctx.fillStyle = SWATCHES[colorIndex]?.color ?? "#fffdf7"
  ctx.fillRect(x, y, 1, 1)
}

export function AuthDoodlePad({ lang }: { lang: Lang }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cellsRef = useRef(new Uint8Array(GRID * GRID))
  const drawingRef = useRef(false)
  const [swatch, setSwatch] = useState<SwatchId>("brick")
  const colorIndex = SWATCHES.findIndex((s) => s.id === swatch)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = "#fffdf7"
    ctx.fillRect(0, 0, GRID, GRID)
    cellsRef.current.fill(5)
  }, [])

  const paintAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const x = Math.floor(((clientX - rect.left) / rect.width) * GRID)
    const y = Math.floor(((clientY - rect.top) / rect.height) * GRID)
    paintCell(ctx, cellsRef.current, x, y, colorIndex < 0 ? 0 : colorIndex)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault()
    drawingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    paintAt(event.clientX, event.clientY)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    paintAt(event.clientX, event.clientY)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    cellsRef.current.fill(5)
    ctx.fillStyle = "#fffdf7"
    ctx.fillRect(0, 0, GRID, GRID)
  }

  return (
    <div className="bg-card">
      <div className="border-b-[3px] border-earth px-4 py-3">
        <p className="pixel-kicker text-earth">PXLB</p>
        <p className="mt-2 text-[15px] font-medium text-fg">{copy.authDoodleTitle[lang]}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">{copy.authDoodleHint[lang]}</p>
      </div>

      <div className="bg-soft p-4">
        <div className="mx-auto aspect-square w-full max-w-[20rem] overflow-hidden border-[3px] border-earth bg-bg">
          <canvas
            ref={canvasRef}
            width={GRID}
            height={GRID}
            className="block h-full w-full touch-none cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-label={copy.authDoodleAria[lang]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t-[3px] border-earth px-4 py-3">
        {SWATCHES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={
              item.id === "erase" ? copy.authDoodleErase[lang] : copy.authDoodleColor[lang]
            }
            aria-pressed={swatch === item.id}
            onClick={() => setSwatch(item.id)}
            className={cn(
              "h-8 w-8 border-[3px] border-earth",
              swatch === item.id ? "shadow-[3px_3px_0_0_var(--fg)]" : null,
            )}
            style={{ backgroundColor: item.color }}
          />
        ))}
        <button
          type="button"
          onClick={clear}
          className="ml-auto min-h-8 border-[3px] border-earth bg-card px-3 text-[13px] font-medium text-fg hover:bg-soft"
        >
          {copy.authDoodleClear[lang]}
        </button>
      </div>
    </div>
  )
}
