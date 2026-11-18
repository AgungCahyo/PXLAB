"use client"

import { useState, type ComponentProps } from "react"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_PAPER, type PixelBrushSize } from "@/lib/pixel"
import { LayerPanel } from "@/components/creations/LayerPanel"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { SizeSlider } from "@/components/ui/SizeSlider"
import { cn } from "@/lib/utils"

type LayerPanelProps = ComponentProps<typeof LayerPanel>

export function StudioInspector({
  lang,
  color,
  documentPalette,
  brushSize,
  hasSelection,
  hasClipboard,
  layerPanel,
  showBrushControls,
  brushLabel,
  showShapeOptions,
  shapeKind,
  shapeFilled,
  shapeMode,
  shapeWidth,
  shapeHeight,
  draftActive,
  onColor,
  onBrushSize,
  onPaletteMore,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRotateSelection,
  onShapeFilled,
  onShapeMode,
  onShapeSize,
  onShapeWidth,
  onShapeHeight,
  onShapeApply,
  onShapeCancel,
}: {
  lang: Lang
  color: string
  documentPalette: string[]
  brushSize: PixelBrushSize
  hasSelection: boolean
  hasClipboard?: boolean
  layerPanel?: Omit<LayerPanelProps, "lang">
  showBrushControls: boolean
  brushLabel?: string
  showShapeOptions?: boolean
  shapeKind?: "rect" | "ellipse" | "bezier" | "polygon" | null
  shapeFilled?: boolean
  shapeMode?: "stroke" | "fill"
  shapeWidth?: number
  shapeHeight?: number
  draftActive?: boolean
  onColor: (hex: string) => void
  onBrushSize: (size: PixelBrushSize) => void
  onPaletteMore: () => void
  onCopy: () => void
  onCut: () => void
  onPaste?: () => void
  onDelete: () => void
  onRotateSelection?: (degrees: number) => void
  onShapeFilled?: (filled: boolean) => void
  onShapeMode?: (mode: "stroke" | "fill") => void
  onShapeSize?: (size: number) => void
  onShapeWidth?: (width: number) => void
  onShapeHeight?: (height: number) => void
  onShapeApply?: () => void
  onShapeCancel?: () => void
}) {
  const [rotateAngle, setRotateAngle] = useState(0)
  const inkCount = documentPalette.filter((swatch) => swatch !== PIXEL_PAPER).length
  const allColors = copy.pixelAllColors[lang].replace("{n}", String(inkCount))
  const isPathShape = shapeKind === "bezier" || shapeKind === "polygon"
  const sizeLabel = showShapeOptions
    ? copy.pixelStrokeWidth[lang]
    : (brushLabel ?? copy.pixelBrushSize[lang])

  const iconHit =
    "studio-hit border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"

  return (
    <aside
      className="studio-inspector hidden w-[var(--studio-inspector,17.5rem)] shrink-0 flex-col overflow-y-auto border-l-[3px] border-earth bg-card md:flex"
      aria-label={copy.pixelInspector[lang]}
    >
      <details className="shrink-0 border-b-[3px] border-earth px-3 py-2">
        <summary
          className="flex cursor-pointer items-center gap-2 py-1 text-[13px] font-medium text-fg"
          title={copy.pixelShortcuts[lang]}
        >
          <PixelIcon name="keyboard" />
          <span>{copy.pixelShortcuts[lang]}</span>
        </summary>
        <p className="pb-2 pt-1 text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
          {copy.pixelStatusShortcuts[lang]}
        </p>
      </details>

      <div className="flex items-center gap-3 border-b-[3px] border-earth px-3 py-3">
        <span
          className="studio-hit border-earth"
          style={{ backgroundColor: color }}
          title={color}
          aria-label={`${copy.pixelColor[lang]} ${color}`}
        />
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-wide text-muted" title={color}>
          {color}
        </p>
      </div>

      <section className="border-b-[3px] border-earth px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-medium text-fg">{copy.pixelPaletteMore[lang]}</h3>
          <button
            type="button"
            onClick={onPaletteMore}
            className={iconHit}
            aria-label={allColors}
            title={allColors}
          >
            <PixelIcon name="palette" />
          </button>
        </div>
        <div
          className="grid grid-cols-6 gap-1.5"
          role="radiogroup"
          aria-label={copy.pixelColor[lang]}
        >
          {documentPalette
            .filter((swatch) => swatch !== PIXEL_PAPER)
            .map((swatch) => (
              <button
                key={swatch}
                type="button"
                role="radio"
                aria-checked={color === swatch}
                aria-label={`${copy.pixelColor[lang]} ${swatch}`}
                title={swatch}
                onClick={() => onColor(swatch)}
                className={cn(
                  "pixel-swatch studio-thumb",
                  color === swatch ? "border-fg" : "border-earth",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
        </div>
      </section>

      <section className="grid gap-3 px-3 py-3">
        {showBrushControls || showShapeOptions ? (
          <SizeSlider
            id="studio-brush"
            label={sizeLabel}
            value={brushSize}
            onChange={(size) => {
              onBrushSize(size)
              onShapeSize?.(size)
            }}
          />
        ) : null}

        {showShapeOptions ? (
          <div className="grid gap-2">
            <p className="sr-only">{copy.pixelShapeMode[lang]}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.pixelShapeMode[lang]}>
              {isPathShape ? (
                <>
                  <button
                    type="button"
                    className={cn(
                      iconHit,
                      shapeMode === "stroke" && "border-fg bg-brick text-white hover:bg-brick",
                    )}
                    aria-label={copy.pixelShapeStroke[lang]}
                    title={copy.pixelShapeStroke[lang]}
                    aria-pressed={shapeMode === "stroke"}
                    onClick={() => onShapeMode?.("stroke")}
                  >
                    <PixelIcon name="shapeStroke" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      iconHit,
                      shapeMode === "fill" && "border-fg bg-brick text-white hover:bg-brick",
                    )}
                    aria-label={copy.pixelShapeFill[lang]}
                    title={copy.pixelShapeFill[lang]}
                    aria-pressed={shapeMode === "fill"}
                    onClick={() => onShapeMode?.("fill")}
                  >
                    <PixelIcon name="shapeFill" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={cn(
                      iconHit,
                      !shapeFilled && "border-fg bg-brick text-white hover:bg-brick",
                    )}
                    aria-label={copy.pixelShapeOutline[lang]}
                    title={copy.pixelShapeOutline[lang]}
                    aria-pressed={!shapeFilled}
                    onClick={() => onShapeFilled?.(false)}
                  >
                    <PixelIcon name="shapeStroke" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      iconHit,
                      shapeFilled && "border-fg bg-brick text-white hover:bg-brick",
                    )}
                    aria-label={copy.pixelShapeFilled[lang]}
                    title={copy.pixelShapeFilled[lang]}
                    aria-pressed={Boolean(shapeFilled)}
                    onClick={() => onShapeFilled?.(true)}
                  >
                    <PixelIcon name="shapeFill" />
                  </button>
                </>
              )}
            </div>
            {!isPathShape ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  value={shapeWidth ?? 1}
                  aria-label={copy.pixelShapeWidth[lang]}
                  title={copy.pixelShapeWidth[lang]}
                  placeholder="W"
                  onChange={(event) =>
                    onShapeWidth?.(Math.max(1, Math.round(Number(event.target.value) || 1)))
                  }
                  className="studio-control w-full border-earth bg-bg px-2 text-center text-[13px] font-medium text-fg"
                />
                <input
                  type="number"
                  min={1}
                  value={shapeHeight ?? 1}
                  aria-label={copy.pixelShapeHeight[lang]}
                  title={copy.pixelShapeHeight[lang]}
                  placeholder="H"
                  onChange={(event) =>
                    onShapeHeight?.(Math.max(1, Math.round(Number(event.target.value) || 1)))
                  }
                  className="studio-control w-full border-earth bg-bg px-2 text-center text-[13px] font-medium text-fg"
                />
              </div>
            ) : null}
            {draftActive ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={cn(iconHit, "border-fg bg-brick text-white hover:bg-brick")}
                  aria-label={copy.pixelShapeApply[lang]}
                  title={copy.pixelShapeApply[lang]}
                  onClick={onShapeApply}
                >
                  <PixelIcon name="apply" />
                </button>
                <button
                  type="button"
                  className={iconHit}
                  aria-label={copy.pixelShapeCancel[lang]}
                  title={copy.pixelShapeCancel[lang]}
                  onClick={onShapeCancel}
                >
                  <PixelIcon name="close" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasSelection || hasClipboard ? (
          <div className="flex flex-wrap gap-1.5 pt-1" role="group" aria-label={copy.pixelSelectBox[lang]}>
            {hasSelection ? (
              <>
                <button
                  type="button"
                  className={iconHit}
                  aria-label={copy.pixelCopy[lang]}
                  title={copy.pixelCopy[lang]}
                  onClick={onCopy}
                >
                  <PixelIcon name="copy" />
                </button>
                <button
                  type="button"
                  className={iconHit}
                  aria-label={copy.pixelCut[lang]}
                  title={copy.pixelCut[lang]}
                  onClick={onCut}
                >
                  <PixelIcon name="cut" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={iconHit}
              aria-label={copy.pixelPaste[lang]}
              title={copy.pixelPaste[lang]}
              disabled={!hasClipboard}
              onClick={onPaste}
            >
              <PixelIcon name="paste" />
            </button>
            {hasSelection ? (
              <button
                type="button"
                className={iconHit}
                aria-label={copy.pixelDeleteSelection[lang]}
                title={copy.pixelDeleteSelection[lang]}
                onClick={onDelete}
              >
                <PixelIcon name="trash" />
              </button>
            ) : null}
          </div>
        ) : null}

        {hasSelection && onRotateSelection ? (
          <div className="mt-3 space-y-2 border-t-[3px] border-earth pt-3">
            <label className="sr-only" htmlFor="studio-rotate-angle">
              {copy.pixelRotateFree[lang]}
            </label>
            <div className="flex items-center gap-2">
              <PixelIcon name="rotate" className="shrink-0 text-muted" />
              <input
                id="studio-rotate-angle"
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotateAngle}
                aria-label={copy.pixelRotateAngle[lang]}
                title={`${copy.pixelRotateAngle[lang]}: ${rotateAngle}°`}
                onChange={(event) => setRotateAngle(Number(event.target.value))}
                className="min-w-0 flex-1"
              />
              <input
                type="number"
                min={-180}
                max={180}
                value={rotateAngle}
                aria-label={copy.pixelRotateAngle[lang]}
                title={copy.pixelRotateAngle[lang]}
                onChange={(event) =>
                  setRotateAngle(Math.max(-180, Math.min(180, Number(event.target.value) || 0)))
                }
                className="studio-control w-14 border-earth bg-bg px-1 text-center text-[13px] font-medium text-fg"
              />
              <button
                type="button"
                className={iconHit}
                aria-label={copy.pixelRotateApply[lang]}
                title={copy.pixelRotateApply[lang]}
                onClick={() => {
                  onRotateSelection(rotateAngle)
                  setRotateAngle(0)
                }}
              >
                <PixelIcon name="apply" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {layerPanel ? <LayerPanel lang={lang} {...layerPanel} /> : null}
    </aside>
  )
}
