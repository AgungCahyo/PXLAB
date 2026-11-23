"use client"

import { useId, useState, type ComponentProps, type ReactNode } from "react"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { PIXEL_PAPER, type PixelBrushSize } from "@/lib/pixel"
import { LayerPanel } from "@/components/creations/LayerPanel"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { SizeSlider } from "@/components/ui/SizeSlider"
import { cn } from "@/lib/utils"

type LayerPanelProps = ComponentProps<typeof LayerPanel>

/**
 * One collapsible inspector panel: a fixed header (toggle, optional summary and
 * action) above a body that scrolls on its own, so no panel can push another
 * one out of reach.
 */
function InspectorSection({
  title,
  summary,
  action,
  open,
  onToggle,
  bodyClassName,
  children,
}: {
  title: string
  summary?: ReactNode
  action?: ReactNode
  open: boolean
  onToggle: () => void
  bodyClassName?: string
  children: ReactNode
}) {
  const bodyId = useId()
  return (
    <section className="flex min-h-0 shrink flex-col border-b-[3px] border-earth">
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-[var(--studio-hit-sm,2.25rem)] min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium text-fg hover:text-brick"
        >
          <PixelIcon name={open ? "minus" : "plus"} className="shrink-0 text-muted" />
          <span className="shrink-0">{title}</span>
          {summary}
        </button>
        {action}
      </div>
      <div
        id={bodyId}
        hidden={!open}
        className={cn("min-h-0 overflow-y-auto overscroll-contain px-3 pb-3", bodyClassName)}
      >
        {children}
      </div>
    </section>
  )
}

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
  tool,
  fillTolerance = 0,
  onFillTolerance,
  brushOptionsPanel,
  fillPatternPanel,
  selectShape = "rect",
  onSelectShape,
  onInvertSelection,
  onExpandSelection,
  onContractSelection,
  onShapeFilled,
  onShapeMode,
  onShapeSize,
  onShapeWidth,
  onShapeHeight,
  onShapeApply,
  onShapeCancel,
  toolLabel,
  symmetryControl,
  symmetryStatus,
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
  tool?: string
  fillTolerance?: number
  onFillTolerance?: (value: number) => void
  /** Opacity/flow/hardness/spacing/pressure/tip controls for freehand brushes. */
  brushOptionsPanel?: ReactNode
  /** Pattern picker for the fill tool. */
  fillPatternPanel?: ReactNode
  selectShape?: "rect" | "ellipse"
  onSelectShape?: (shape: "rect" | "ellipse") => void
  onInvertSelection?: () => void
  onExpandSelection?: () => void
  onContractSelection?: () => void
  onShapeFilled?: (filled: boolean) => void
  onShapeMode?: (mode: "stroke" | "fill") => void
  onShapeSize?: (size: number) => void
  onShapeWidth?: (width: number) => void
  onShapeHeight?: (height: number) => void
  onShapeApply?: () => void
  onShapeCancel?: () => void
  /** Display name of the active tool; shown beside the Options heading. */
  toolLabel?: string
  /** Symmetry toggle for freehand brushes (null when the active tool has none). */
  symmetryControl?: ReactNode
  /** Current symmetry mode, e.g. "Mirror X". */
  symmetryStatus?: string
}) {
  const [rotateAngle, setRotateAngle] = useState(0)
  // Panels are independent disclosures: palette + options collapse, layers always keep the flexible space.
  const [paletteOpen, setPaletteOpen] = useState(true)
  const [optionsOpen, setOptionsOpen] = useState(true)
  const [dynamicsOpen, setDynamicsOpen] = useState(false)
  const dynamicsId = useId()
  const fillToleranceId = useId()
  const toleranceLabel = tool === "fill" ? copy.pixelFillTolerance[lang] : copy.pixelSelectTolerance[lang]
  const inkCount = documentPalette.filter((swatch) => swatch !== PIXEL_PAPER).length
  const allColors = copy.pixelAllColors[lang].replace("{n}", String(inkCount))
  const isPathShape = shapeKind === "bezier" || shapeKind === "polygon"
  const sizeLabel = showShapeOptions
    ? copy.pixelStrokeWidth[lang]
    : (brushLabel ?? copy.pixelBrushSize[lang])

  const iconHit =
    "studio-hit border-earth bg-bg text-fg hover:bg-soft disabled:opacity-40"
  const brushFamily = tool === "pencil" || tool === "circle" || tool === "eraser"
  const toleranceTool = tool === "fill" || tool === "selectContiguous" || tool === "selectColor"
  // The Options panel only exists when the active tool (or a live selection) has something to show.
  const hasToolOptions = Boolean(
    showBrushControls ||
      showShapeOptions ||
      (brushOptionsPanel && brushFamily) ||
      (symmetryControl && brushFamily) ||
      toleranceTool ||
      tool === "selectPolygon" ||
      tool === "select" ||
      hasSelection ||
      hasClipboard,
  )

  return (
    <aside
      className="studio-inspector hidden w-[var(--studio-inspector,17.5rem)] shrink-0 flex-col overflow-hidden border-l-[3px] border-earth bg-card md:flex"
      aria-label={copy.pixelInspector[lang]}
    >
      <InspectorSection
        title={copy.pixelPaletteMore[lang]}
        summary={
          <span
            className="flex min-w-0 items-center gap-1.5"
            title={color}
            aria-label={`${copy.pixelColor[lang]} ${color}`}
          >
            <span
              className="inline-block h-4 w-4 shrink-0 border-2 border-earth"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="min-w-0 truncate font-mono text-[11px] font-normal uppercase tracking-wide text-muted">
              {color}
            </span>
          </span>
        }
        action={
          <button
            type="button"
            onClick={onPaletteMore}
            className="studio-hit-sm border-earth bg-bg text-fg hover:bg-soft"
            aria-label={`${copy.pixelPaletteBrowse[lang]} · ${allColors}`}
            title={copy.pixelPaletteBrowse[lang]}
          >
            <PixelIcon name="palette" />
          </button>
        }
        open={paletteOpen}
        onToggle={() => setPaletteOpen((value) => !value)}
        bodyClassName="max-h-44"
      >
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={copy.pixelColor[lang]}>
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
                  "pixel-swatch studio-thumb !h-auto !min-h-0 !w-full !min-w-0 aspect-square",
                  color === swatch ? "border-fg" : "border-earth",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
        </div>
      </InspectorSection>

      {hasToolOptions ? (
        <InspectorSection
          title={copy.pixelToolOptions[lang]}
          summary={
            toolLabel ? (
              <span className="min-w-0 truncate text-[length:var(--studio-meta,0.75rem)] font-normal text-muted">
                {toolLabel}
              </span>
            ) : null
          }
          open={optionsOpen}
          onToggle={() => setOptionsOpen((value) => !value)}
          bodyClassName="max-h-[22rem]"
        >
          <div className="grid gap-3">
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

            {symmetryControl && brushFamily ? (
              <div className="flex items-center gap-2">
                {symmetryControl}
                <span className="min-w-0 truncate text-[13px] font-medium text-fg">{copy.pixelSymmetry[lang]}</span>
                {symmetryStatus ? (
                  <span className="ml-auto shrink-0 text-[length:var(--studio-meta,0.75rem)] text-muted">
                    {symmetryStatus}
                  </span>
                ) : null}
              </div>
            ) : null}

            {brushOptionsPanel && brushFamily ? (
              <div className="border-t-[3px] border-earth pt-2">
                <button
                  type="button"
                  aria-expanded={dynamicsOpen}
                  aria-controls={dynamicsId}
                  onClick={() => setDynamicsOpen((value) => !value)}
                  className="flex min-h-[var(--studio-hit-sm,2.25rem)] w-full items-center gap-2 text-left text-[13px] font-medium text-fg hover:text-brick"
                >
                  <PixelIcon name={dynamicsOpen ? "minus" : "plus"} className="shrink-0 text-muted" />
                  <span className="truncate">{copy.pixelBrushOptions[lang]}</span>
                </button>
                <div id={dynamicsId} hidden={!dynamicsOpen} className="pt-2">
                  {brushOptionsPanel}
                </div>
              </div>
            ) : null}

            {tool === "fill" || tool === "selectContiguous" || tool === "selectColor" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="min-w-0 flex-1 text-[13px] font-medium text-fg" htmlFor={fillToleranceId}>
                    {toleranceLabel}
                  </label>
                  <span className="w-8 text-right text-[13px] tabular-nums text-fg">{fillTolerance}</span>
                </div>
                <input
                  id={fillToleranceId}
                  type="range"
                  min={0}
                  max={255}
                  step={1}
                  value={fillTolerance}
                  aria-label={toleranceLabel}
                  onChange={(event) => onFillTolerance?.(Number(event.target.value))}
                  className="w-full"
                />
                {tool === "fill" ? fillPatternPanel : null}
                {tool === "fill" ? (
                  <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
                    {copy.pixelFillGlobalHint[lang]}
                  </p>
                ) : null}
              </div>
            ) : null}

            {tool === "selectPolygon" ? (
              <p className="text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
                {copy.pixelSelectPolygonHint[lang]}
              </p>
            ) : null}

            {tool === "select" ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.pixelSelectShape[lang]}>
                <button
                  type="button"
                  className={cn(
                    "studio-control inline-flex items-center border-earth bg-bg px-2 text-[12px] font-medium text-fg",
                    selectShape === "rect" && "border-fg bg-brick text-white",
                  )}
                  aria-pressed={selectShape === "rect"}
                  onClick={() => onSelectShape?.("rect")}
                >
                  {copy.pixelSelectRect[lang]}
                </button>
                <button
                  type="button"
                  className={cn(
                    "studio-control inline-flex items-center border-earth bg-bg px-2 text-[12px] font-medium text-fg",
                    selectShape === "ellipse" && "border-fg bg-brick text-white",
                  )}
                  aria-pressed={selectShape === "ellipse"}
                  onClick={() => onSelectShape?.("ellipse")}
                >
                  {copy.pixelSelectEllipse[lang]}
                </button>
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

            {hasSelection ? (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="studio-control inline-flex items-center border-earth bg-bg px-2 text-[12px] font-medium text-fg"
                  onClick={onInvertSelection}
                >
                  {copy.pixelSelectInvert[lang]}
                </button>
                <button
                  type="button"
                  className="studio-control inline-flex items-center border-earth bg-bg px-2 text-[12px] font-medium text-fg"
                  title="Shift+]"
                  onClick={onExpandSelection}
                >
                  {copy.pixelSelectExpand[lang]}
                </button>
                <button
                  type="button"
                  className="studio-control inline-flex items-center border-earth bg-bg px-2 text-[12px] font-medium text-fg"
                  title="Shift+["
                  onClick={onContractSelection}
                >
                  {copy.pixelSelectContract[lang]}
                </button>
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
          </div>
        </InspectorSection>
      ) : null}

      {layerPanel ? (
        <div className="min-h-[8rem] flex-1 overflow-y-auto overscroll-contain">
          <LayerPanel lang={lang} {...layerPanel} />
        </div>
      ) : (
        <div className="flex-1" aria-hidden="true" />
      )}

      <details className={cn("shrink-0 px-3 py-1", !layerPanel && "border-t-[3px] border-earth")}>
        <summary
          className="flex min-h-[var(--studio-hit-sm,2.25rem)] cursor-pointer items-center gap-2 text-[13px] font-medium text-fg"
          title={copy.pixelShortcuts[lang]}
        >
          <PixelIcon name="keyboard" />
          <span>{copy.pixelShortcuts[lang]}</span>
        </summary>
        <p className="pb-2 pt-1 text-[length:var(--studio-meta,0.75rem)] leading-relaxed text-muted">
          {copy.pixelStatusShortcuts[lang]}
        </p>
      </details>
    </aside>
  )
}
