"use client"

import { useState, type ComponentProps } from "react"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_PAPER, type PixelBrushSize, type PixelSymmetry } from "@/lib/pixel"
import { LayerPanel } from "@/components/creations/LayerPanel"
import { Button } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { SizeSlider } from "@/components/ui/SizeSlider"
import { cn } from "@/lib/utils"

type LayerPanelProps = ComponentProps<typeof LayerPanel>

export function StudioInspector({
  lang,
  color,
  documentPalette,
  brushSize,
  symmetry,
  hasSelection,
  hasClipboard,
  layerPanel,
  showBrushControls,
  brushLabel,
  showSymmetryControls,
  showShapeOptions,
  shapeKind,
  shapeFilled,
  shapeMode,
  shapeWidth,
  shapeHeight,
  draftActive,
  onColor,
  onBrushSize,
  onSymmetry,
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
  symmetry: PixelSymmetry
  hasSelection: boolean
  hasClipboard?: boolean
  layerPanel?: Omit<LayerPanelProps, "lang">
  showBrushControls: boolean
  brushLabel?: string
  showSymmetryControls: boolean
  showShapeOptions?: boolean
  shapeKind?: "rect" | "ellipse" | "bezier" | "polygon" | null
  shapeFilled?: boolean
  shapeMode?: "stroke" | "fill"
  shapeWidth?: number
  shapeHeight?: number
  draftActive?: boolean
  onColor: (hex: string) => void
  onBrushSize: (size: PixelBrushSize) => void
  onSymmetry: (mode: PixelSymmetry) => void
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

  return (
    <aside
      className="studio-inspector hidden w-[var(--studio-inspector,17.5rem)] shrink-0 flex-col overflow-y-auto border-l-[3px] border-earth bg-card md:flex"
      aria-label={copy.pixelInspector[lang]}
    >
      <details className="shrink-0 border-b-[3px] border-earth px-3 py-2">
        <summary className="cursor-pointer py-1 text-[13px] font-medium text-fg">
          {copy.pixelShortcuts[lang]}
        </summary>
        <p className="pb-2 pt-1 text-[12px] leading-relaxed text-muted">
          {copy.pixelStatusShortcuts[lang]}
        </p>
      </details>

      <div className="flex items-center gap-3 border-b-[3px] border-earth px-3 py-3">
        <span
          className="h-11 w-11 shrink-0 border-[3px] border-earth"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">{copy.pixelColor[lang]}</p>
          <p className="truncate text-[12px] text-muted">{color}</p>
        </div>
      </div>

      <section className="border-b-[3px] border-earth px-3 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-medium text-fg">{copy.pixelPaletteMore[lang]}</h3>
          <button
            type="button"
            onClick={onPaletteMore}
            className="text-[12px] text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            {allColors}
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
                onClick={() => onColor(swatch)}
                className={cn(
                  "pixel-swatch h-8 w-8 border-[3px]",
                  color === swatch ? "border-fg" : "border-earth",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
        </div>
        <button
          type="button"
          aria-label={copy.pixelPaletteMore[lang]}
          onClick={onPaletteMore}
          className="mt-2 inline-flex h-11 w-11 items-center justify-center border-[3px] border-earth bg-bg"
        >
          <PixelIcon name="palette" />
        </button>
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
            <p className="text-[13px] font-medium text-fg">{copy.pixelShapeMode[lang]}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.pixelShapeMode[lang]}>
              {isPathShape ? (
                <>
                  <Button
                    type="button"
                    variant={shapeMode === "stroke" ? "primary" : "outline"}
                    className="h-11"
                    aria-pressed={shapeMode === "stroke"}
                    onClick={() => onShapeMode?.("stroke")}
                  >
                    {copy.pixelShapeStroke[lang]}
                  </Button>
                  <Button
                    type="button"
                    variant={shapeMode === "fill" ? "primary" : "outline"}
                    className="h-11"
                    aria-pressed={shapeMode === "fill"}
                    onClick={() => onShapeMode?.("fill")}
                  >
                    {copy.pixelShapeFill[lang]}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant={!shapeFilled ? "primary" : "outline"}
                    className="h-11"
                    aria-pressed={!shapeFilled}
                    onClick={() => onShapeFilled?.(false)}
                  >
                    {copy.pixelShapeOutline[lang]}
                  </Button>
                  <Button
                    type="button"
                    variant={shapeFilled ? "primary" : "outline"}
                    className="h-11"
                    aria-pressed={Boolean(shapeFilled)}
                    onClick={() => onShapeFilled?.(true)}
                  >
                    {copy.pixelShapeFilled[lang]}
                  </Button>
                </>
              )}
            </div>
            {!isPathShape ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[13px] font-medium text-fg">
                  {copy.pixelShapeWidth[lang]}
                  <input
                    type="number"
                    min={1}
                    value={shapeWidth ?? 1}
                    aria-label={copy.pixelShapeWidth[lang]}
                    onChange={(event) => onShapeWidth?.(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                    className="h-11 border-[3px] border-earth bg-bg px-2 text-[13px] font-medium text-fg"
                  />
                </label>
                <label className="grid gap-1 text-[13px] font-medium text-fg">
                  {copy.pixelShapeHeight[lang]}
                  <input
                    type="number"
                    min={1}
                    value={shapeHeight ?? 1}
                    aria-label={copy.pixelShapeHeight[lang]}
                    onChange={(event) => onShapeHeight?.(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                    className="h-11 border-[3px] border-earth bg-bg px-2 text-[13px] font-medium text-fg"
                  />
                </label>
              </div>
            ) : null}
            {draftActive ? (
              <div className="flex flex-wrap gap-1.5">
                <Button type="button" className="h-11" onClick={onShapeApply}>
                  {copy.pixelShapeApply[lang]}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={onShapeCancel}>
                  {copy.pixelShapeCancel[lang]}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {showSymmetryControls ? (
          <>
            <label className="text-[13px] font-medium text-fg" htmlFor="studio-symmetry">
              {copy.pixelSymmetry[lang]}
            </label>
            <select
              id="studio-symmetry"
              aria-label={copy.pixelSymmetry[lang]}
              value={symmetry}
              onChange={(event) => onSymmetry(event.target.value as PixelSymmetry)}
              className="h-11 border-[3px] border-earth bg-bg px-2 text-[13px] font-medium text-fg"
            >
              <option value="off">{copy.pixelSymmetryOff[lang]}</option>
              <option value="x">{copy.pixelSymmetryX[lang]}</option>
              <option value="y">{copy.pixelSymmetryY[lang]}</option>
              <option value="xy">{copy.pixelSymmetryXY[lang]}</option>
            </select>
          </>
        ) : null}
        {hasSelection || hasClipboard ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hasSelection ? (
              <>
                <Button type="button" variant="outline" className="h-11" onClick={onCopy}>
                  {copy.pixelCopy[lang]}
                </Button>
                <Button type="button" variant="outline" className="h-11" onClick={onCut}>
                  {copy.pixelCut[lang]}
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={!hasClipboard}
              onClick={onPaste}
            >
              {copy.pixelPaste[lang]}
            </Button>
            {hasSelection ? (
              <Button type="button" variant="outline" className="h-11" onClick={onDelete}>
                {copy.pixelDeleteSelection[lang]}
              </Button>
            ) : null}
          </div>
        ) : null}

        {hasSelection && onRotateSelection ? (
          <div className="mt-3 space-y-2 border-t-[3px] border-earth pt-3">
            <label className="text-[13px] font-medium text-fg" htmlFor="studio-rotate-angle">
              {copy.pixelRotateFree[lang]}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="studio-rotate-angle"
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotateAngle}
                aria-label={copy.pixelRotateAngle[lang]}
                onChange={(event) => setRotateAngle(Number(event.target.value))}
                className="min-w-0 flex-1"
              />
              <input
                type="number"
                min={-180}
                max={180}
                value={rotateAngle}
                aria-label={copy.pixelRotateAngle[lang]}
                onChange={(event) =>
                  setRotateAngle(Math.max(-180, Math.min(180, Number(event.target.value) || 0)))
                }
                className="h-11 w-16 border-[3px] border-earth bg-bg px-1 text-center text-[13px] font-medium text-fg"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                onRotateSelection(rotateAngle)
                setRotateAngle(0)
              }}
            >
              {copy.pixelRotateApply[lang]}
            </Button>
          </div>
        ) : null}
      </section>

      {layerPanel ? <LayerPanel lang={lang} {...layerPanel} /> : null}
    </aside>
  )
}
