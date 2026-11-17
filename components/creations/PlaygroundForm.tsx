"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import {
  PixelBoard,
  type PixelBoardHandle,
  type ShapeDraftInfo,
  type Tool,
} from "@/components/canvas/PixelBoard"
import { ColorPicker } from "@/components/creations/ColorPicker"
import { CreationMoreMenu } from "@/components/creations/CreationMoreMenu"
import { DocumentPaletteDialog } from "@/components/creations/DocumentPaletteDialog"
import { CreationTagInput } from "@/components/creations/CreationTagInput"
import { DeleteCreationCopy } from "@/components/creations/DeleteCreationCopy"
import { PixelArt } from "@/components/creations/PixelArt"
import { StudioContextMenu } from "@/components/creations/StudioContextMenu"
import { StudioInspector } from "@/components/creations/StudioInspector"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon"
import { SizeSlider } from "@/components/ui/SizeSlider"
import {
  deleteCreationAction,
  discardVirginPixelDraftAction,
  updatePixelCreationAction,
  type CreationActionState,
} from "@/features/creations/actions"
import { isVirginPixelDraft } from "@/lib/virgin-draft"
import type { CreationRow } from "@/features/creations/queries"
import {
  clearLocalCreationDraft,
  clearLocalCreationMetadata,
  clearLocalCreationSource,
  readLocalCreationMetadata,
  readLocalCreationSource,
  writeLocalCreationMetadata,
  writeLocalCreationSource,
} from "@/lib/creation-metadata-local"
import { displayTitle, isUnnamedTitle, titleForStorage } from "@/lib/creations"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import {
  buildPixelSourceV2,
  createEmptyLayer,
  filledPixelIndices,
  formatPixelSize,
  PIXEL_INK,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  type PixelBrushSize,
  type PixelSource,
  type PixelSymmetry,
  type PixelZoom,
} from "@/lib/pixel"
import type { PixelLayerInfo } from "@/components/canvas/PixelBoard"
import {
  LayerMobileSheet,
  LayerMobileStrip,
  type LayerPanelFeedback,
} from "@/components/creations/LayerPanel"

function inkLayerSource(width: number, height: number): PixelSource {
  const layer = createEmptyLayer(width, height, "Layer 1")
  layer.indices = filledPixelIndices(1, width, height)
  return buildPixelSourceV2([layer], width, height)
}
import {
  CREATION_CAPTION_MAX,
  CREATION_TITLE_MAX,
  PIXEL_PNG_MAX_BYTES,
  PIXEL_SOURCE_MAX_BYTES,
} from "@/lib/site"
import { pixelContentSchema } from "@/lib/validations/creation"
import { cn } from "@/lib/utils"

function PlaygroundDeleteSubmit({ lang }: { lang: Lang }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
      {pending ? copy.createDeleting[lang] : copy.createDelete[lang]}
    </Button>
  )
}

type SaveStatus = "saved" | "saving" | "unsaved"

/** Debounce browser-local pixel draft writes only — never hits the database. */
const LOCAL_SOURCE_MS = 400

export function PlaygroundForm({
  lang,
  creation,
  initialSource,
  loadBroken,
  remixOf = null,
}: {
  lang: Lang
  creation: CreationRow
  initialSource: PixelSource | null
  loadBroken: boolean
  remixOf?: { id: string; title: string; authorUsername: string } | null
}) {
  const header = pixelContentSchema.safeParse(creation.content)
  const width = header.success ? header.data.width : 64
  const height = header.success ? header.data.height : 64
  const stageGround = header.success ? header.data.stage_ground ?? null : null

  const router = useRouter()
  const boardRef = useRef<PixelBoardHandle>(null)
  const flightRef = useRef<Promise<void>>(Promise.resolve())
  const editGen = useRef(0)
  const dirtyRef = useRef(false)
  const pendingRef = useRef(false)
  const [preview, setPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [publishName, setPublishName] = useState("")
  const [nameError, setNameError] = useState(false)
  const [publishDoneOpen, setPublishDoneOpen] = useState(false)
  const [captionNudgeOpen, setCaptionNudgeOpen] = useState(false)
  const [title, setTitle] = useState(isUnnamedTitle(creation.title) ? "" : creation.title)
  const [caption, setCaption] = useState(creation.caption ?? "")
  const [tags, setTags] = useState<string[]>(creation.tags ?? [])
  const [statusPublished, setStatusPublished] = useState(creation.status === "published")
  const [tool, setTool] = useState<Tool>("pencil")
  const [brushSize, setBrushSize] = useState<PixelBrushSize>(1)
  const [shapeDraft, setShapeDraft] = useState<ShapeDraftInfo>({
    active: false,
    kind: null,
    filled: false,
    mode: "stroke",
    strokeWidth: 1,
    width: 0,
    height: 0,
  })
  const [gridVisible, setGridVisible] = useState(true)
  const [zoom, setZoom] = useState<PixelZoom>("fit")
  const [hasSelection, setHasSelection] = useState(false)
  const [hasClipboard, setHasClipboard] = useState(false)
  const [editFlash, setEditFlash] = useState<string | null>(null)
  const editFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rotateHint, setRotateHint] = useState(false)
  const [symmetry, setSymmetry] = useState<PixelSymmetry>("off")
  const [paletteManageOpen, setPaletteManageOpen] = useState(false)
  const [paletteFullAlert, setPaletteFullAlert] = useState(false)
  const [canvasMenu, setCanvasMenu] = useState<{ x: number; y: number } | null>(null)
  const [canvasSizeOpen, setCanvasSizeOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [boardEpoch, setBoardEpoch] = useState(0)
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null)
  const hoverCellRef = useRef<{ x: number; y: number } | null>(null)
  const hoverRaf = useRef(0)
  const serverPalette = initialSource?.palette?.length
    ? [...initialSource.palette]
    : header.success
      ? [...header.data.palette]
      : [...PIXEL_PALETTE]
  const [color, setColor] = useState(
    serverPalette.find((item) => item !== PIXEL_PAPER) ?? PIXEL_INK,
  )
  const [documentPalette, setDocumentPalette] = useState<string[]>(serverPalette)
  const [boardSource, setBoardSource] = useState<PixelSource | null>(initialSource)
  const [layers, setLayers] = useState<PixelLayerInfo[]>([])
  const [layerSheetId, setLayerSheetId] = useState<string | null>(null)
  const [layerThumbEpoch, setLayerThumbEpoch] = useState(0)
  const [boardReady, setBoardReady] = useState(false)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)
  const [busyIntent, setBusyIntent] = useState<"draft" | "publish" | "unpublish" | null>(null)
  const [metadataDirty, setMetadataDirty] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [leaveBlockedOpen, setLeaveBlockedOpen] = useState(false)
  const [state, setState] = useState<CreationActionState>(null)
  const [clientError, setClientError] = useState<CreationActionState>(null)
  const [offline, setOffline] = useState(false)
  const [localDraftFailed, setLocalDraftFailed] = useState(false)
  const localSourceTimerRef = useRef<number>(0)
  const leavingRef = useRef(false)
  const leaveDestRef = useRef(href(lang, "/dashboard"))
  const leaveRef = useRef<(dest?: string) => Promise<void>>(async () => undefined)
  const metadataDirtyRef = useRef(false)
  const savedTitleRef = useRef(titleForStorage(isUnnamedTitle(creation.title) ? "" : creation.title))
  const savedCaptionRef = useRef(creation.caption ?? "")
  const savedTagsRef = useRef<string[]>(creation.tags ?? [])
  type PersistOptions = { silent?: boolean; commitMetadata?: boolean }
  dirtyRef.current = dirty
  pendingRef.current = pending
  leavingRef.current = leaving
  metadataDirtyRef.current = metadataDirty

  const published = statusPublished
  const titleRef = useRef(title)
  titleRef.current = title
  const captionRef = useRef(caption)
  captionRef.current = caption
  const tagsRef = useRef(tags)
  tagsRef.current = tags

  const hasUnsavedWork = () =>
    dirtyRef.current || metadataDirtyRef.current || pendingRef.current

  const markCanvasDirty = () => {
    editGen.current += 1
    dirtyRef.current = true
    setDirty(true)
  }

  const touchMetadata = (next?: { title?: string; caption?: string; tags?: string[] }) => {
    const snapshot = {
      title: next?.title ?? titleRef.current,
      caption: next?.caption ?? captionRef.current,
      tags: next?.tags ?? tagsRef.current,
    }
    metadataDirtyRef.current = true
    setMetadataDirty(true)
    writeLocalCreationMetadata(creation.id, snapshot)
  }

  const scheduleLocalSourceDraft = () => {
    markCanvasDirty()
    window.clearTimeout(localSourceTimerRef.current)
    localSourceTimerRef.current = window.setTimeout(() => {
      const board = boardRef.current
      if (!board) return
      void (async () => {
        try {
          const ok = await writeLocalCreationSource(creation.id, board.exportSource())
          setLocalDraftFailed(!ok)
        } catch {
          setLocalDraftFailed(true)
        }
      })()
    }, LOCAL_SOURCE_MS)
  }

  const reportHover = (cell: { x: number; y: number } | null) => {
    hoverCellRef.current = cell
    if (hoverRaf.current) return
    hoverRaf.current = window.requestAnimationFrame(() => {
      hoverRaf.current = 0
      setHoverCell(hoverCellRef.current)
    })
  }

  const discardUnsaved = async () => {
    window.clearTimeout(localSourceTimerRef.current)
    await clearLocalCreationSource(creation.id)
    dirtyRef.current = false
    setDirty(false)
    setLocalDraftFailed(false)
    setBoardSource(
      !initialSource && stageGround === "ink" ? inkLayerSource(width, height) : initialSource,
    )
    setBoardEpoch((value) => value + 1)
    setDiscardOpen(false)
  }

  const commitSavedMetadata = (nextTitle: string, nextCaption: string, nextTags: string[]) => {
    savedTitleRef.current = nextTitle
    savedCaptionRef.current = nextCaption
    savedTagsRef.current = nextTags
    metadataDirtyRef.current = false
    setMetadataDirty(false)
    clearLocalCreationMetadata(creation.id)
  }

  const persist = (intent: "draft" | "publish" | "unpublish", options: PersistOptions = {}) => {
    const silent = options.silent === true
    const commitMetadata = options.commitMetadata === true || intent === "publish" || intent === "unpublish"
    const job = flightRef.current.then(async (): Promise<CreationActionState> => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true)
        if (commitMetadata) {
          metadataDirtyRef.current = true
          setMetadataDirty(true)
        } else {
          dirtyRef.current = true
          setDirty(true)
        }
        return null
      }
      if (!silent) setClientError(null)
      setBusyIntent(intent)
      setPending(true)
      pendingRef.current = true
      const savedGen = editGen.current
      try {
        const liveTitle =
          intent === "publish" ? titleRef.current.trim() : titleForStorage(titleRef.current)
        const nextTitle = commitMetadata ? liveTitle : savedTitleRef.current
        const nextCaption = commitMetadata ? captionRef.current : savedCaptionRef.current
        const nextTags = commitMetadata ? tagsRef.current : savedTagsRef.current
        if (intent === "publish" && isUnnamedTitle(nextTitle)) {
          const error = { error: "title_required" as const }
          if (!silent) setClientError(error)
          return error
        }
        const formData = new FormData()
        formData.set("lang", lang)
        formData.set("id", creation.id)
        formData.set("title", nextTitle)
        formData.set("caption", nextCaption)
        formData.set("tags", JSON.stringify(nextTags))
        formData.set("intent", intent)

        if (intent !== "unpublish") {
          const board = boardRef.current
          if (!board) {
            const error = { error: "invalid_input" as const }
            if (!silent) setClientError(error)
            return error
          }
          const source = board.exportSource()
          const sourceJson = JSON.stringify(source)
          if (sourceJson.length > PIXEL_SOURCE_MAX_BYTES) {
            const error = { error: "payload_too_large" as const }
            setClientError(error)
            setDirty(true)
            return error
          }
          let png: Blob
          try {
            png = await board.exportPng()
          } catch {
            const error = { error: "invalid_input" as const }
            if (!silent) setClientError(error)
            return error
          }
          if (png.size > PIXEL_PNG_MAX_BYTES) {
            const error = { error: "payload_too_large" as const }
            setClientError(error)
            setDirty(true)
            return error
          }
          formData.set("source", new File([sourceJson], "source.json", { type: "application/json" }))
          formData.set("cover", new File([png], "cover.png", { type: "image/png" }))
        }

        const result = await updatePixelCreationAction(null, formData)
        setState(result)
        if (result && "error" in result) {
          if (commitMetadata) {
            metadataDirtyRef.current = true
            setMetadataDirty(true)
          }
          dirtyRef.current = true
          setDirty(true)
          if (!silent) setClientError(result)
          return result
        }
        if (result && "ok" in result) {
          if (intent === "publish") setStatusPublished(true)
          if (intent === "unpublish") setStatusPublished(false)
          if (commitMetadata) commitSavedMetadata(nextTitle, nextCaption, [...nextTags])
          if (intent !== "unpublish") {
            window.clearTimeout(localSourceTimerRef.current)
            if (editGen.current === savedGen) {
              dirtyRef.current = false
              setDirty(false)
              void clearLocalCreationSource(creation.id)
            }
          }
        }
        return result
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setOffline(true)
          dirtyRef.current = true
          setDirty(true)
          return null
        }
        const error = { error: "invalid_input" as const }
        dirtyRef.current = true
        setDirty(true)
        if (!silent) setClientError(error)
        return error
      } finally {
        pendingRef.current = false
        setPending(false)
        setBusyIntent(null)
      }
    })
    flightRef.current = job.then(
      () => undefined,
      () => undefined,
    )
    return job
  }

  /** Explicit save only — no server autosave for pixels or metadata. */
  const saveExplicit = () => persist("draft", { commitMetadata: true })

  const discardVirginIfNeeded = async () => {
    if (!isVirginPixelDraft(creation)) return
    await clearLocalCreationDraft(creation.id)
    try {
      await discardVirginPixelDraftAction(creation.id, lang)
    } catch {
      /* navigation still proceeds; orphan draft can be deleted manually */
    }
  }

  const leave = async (dest = href(lang, "/dashboard")) => {
    leaveDestRef.current = dest
    window.clearTimeout(localSourceTimerRef.current)
    if (!hasUnsavedWork()) {
      setLeaving(true)
      leavingRef.current = true
      await discardVirginIfNeeded()
      setLeaving(false)
      leavingRef.current = false
      router.push(dest)
      return
    }
    setLeaveConfirmOpen(true)
  }
  leaveRef.current = leave

  const leaveSaveAndGo = async () => {
    setLeaveConfirmOpen(false)
    setLeaving(true)
    leavingRef.current = true
    const gen = editGen.current
    const result = await persist("draft", { commitMetadata: true })
    if (!result || "error" in result || editGen.current !== gen) {
      setLeaving(false)
      leavingRef.current = false
      setLeaveBlockedOpen(true)
      return
    }
    setLeaving(false)
    leavingRef.current = false
    router.push(leaveDestRef.current)
  }

  const leaveWithoutSaving = () => {
    dirtyRef.current = false
    setDirty(false)
    metadataDirtyRef.current = false
    setMetadataDirty(false)
    window.clearTimeout(localSourceTimerRef.current)
    void clearLocalCreationDraft(creation.id)
    setLeaveConfirmOpen(false)
    setLeaveBlockedOpen(false)
    setLeaving(true)
    leavingRef.current = true
    void discardVirginIfNeeded().finally(() => {
      setLeaving(false)
      leavingRef.current = false
      router.push(leaveDestRef.current)
    })
  }

  const retryLeave = () => {
    setLeaveBlockedOpen(false)
    void leaveSaveAndGo()
  }

  const runPublish = () => {
    void persist("publish", { commitMetadata: true }).then((result) => {
      if (result && "ok" in result && result.published) setPublishDoneOpen(true)
    })
  }

  const continuePublishAfterTitle = () => {
    if (!captionRef.current.trim()) {
      setCaptionNudgeOpen(true)
      return
    }
    runPublish()
  }

  const requestPublish = () => {
    if (!titleRef.current.trim() || isUnnamedTitle(titleRef.current)) {
      setPublishName("")
      setNameError(false)
      setNameOpen(true)
      return
    }
    continuePublishAfterTitle()
  }

  const confirmNameAndPublish = () => {
    const name = publishName.trim()
    if (!name || isUnnamedTitle(name)) {
      setNameError(true)
      return
    }
    setTitle(name)
    titleRef.current = name
    touchMetadata({ title: name })
    setNameOpen(false)
    continuePublishAfterTitle()
  }

  useEffect(() => {
    let cancelled = false
    const localMeta = readLocalCreationMetadata(creation.id)
    if (localMeta) {
      setCaption(localMeta.caption)
      setTags(localMeta.tags)
      captionRef.current = localMeta.caption
      tagsRef.current = localMeta.tags
      metadataDirtyRef.current = true
      setMetadataDirty(true)
    }

    void (async () => {
      const localSource = await readLocalCreationSource(creation.id)
      if (cancelled) return
      if (localSource && localSource.width === width && localSource.height === height) {
        setBoardSource(localSource)
        if (localSource.palette?.length) {
          setDocumentPalette([...localSource.palette])
          setColor(localSource.palette.find((item) => item !== PIXEL_PAPER) ?? PIXEL_INK)
        }
        dirtyRef.current = true
        setDirty(true)
      } else if (!initialSource && stageGround === "ink") {
        setBoardSource(inkLayerSource(width, height))
      } else {
        setBoardSource(initialSource)
      }
      setBoardReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [creation.id, height, initialSource, stageGround, width])

  useEffect(() => {
    document.body.classList.add("playground-open")
    const warn = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedWork()) return
      event.preventDefault()
      event.returnValue = ""
    }
    const showOffline = () => setOffline(true)
    const resume = () => setOffline(false)
    const guardChromeNav = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (leavingRef.current) {
        event.preventDefault()
        event.stopPropagation()
        return
      }
      if (!hasUnsavedWork()) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (!anchor.closest("header.fixed") && !anchor.closest(".app-tabbar")) return
      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      const next = `${url.pathname}${url.search}${url.hash}`
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (next === current) return
      event.preventDefault()
      event.stopPropagation()
      void leaveRef.current(next)
    }
    if (typeof navigator !== "undefined") setOffline(!navigator.onLine)
    window.addEventListener("beforeunload", warn)
    window.addEventListener("offline", showOffline)
    window.addEventListener("online", resume)
    document.addEventListener("click", guardChromeNav, true)
    return () => {
      window.clearTimeout(localSourceTimerRef.current)
      window.cancelAnimationFrame(hoverRaf.current)
      window.removeEventListener("beforeunload", warn)
      window.removeEventListener("offline", showOffline)
      window.removeEventListener("online", resume)
      document.removeEventListener("click", guardChromeNav, true)
      document.body.classList.remove("playground-open")
    }
  }, [])

  const getNativePng = useCallback(async () => {
    const board = boardRef.current
    if (!board) throw new Error("board")
    return board.exportPng()
  }, [])

  const togglePreview = async () => {
    if (preview) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPreview(false)
      return
    }
    try {
      const png = await getNativePng()
      setPreviewUrl(URL.createObjectURL(png))
      setPreview(true)
    } catch {
      setClientError({ error: "invalid_input" })
    }
  }

  const errorState = clientError && "error" in clientError ? clientError : state && "error" in state ? state : null
  const saveStatus: SaveStatus = pending
    ? "saving"
    : dirty || metadataDirty || (state && "error" in state)
      ? "unsaved"
      : "saved"
  const saveLabel =
    saveStatus === "saving"
      ? copy.pixelSaving[lang]
      : saveStatus === "unsaved"
        ? copy.pixelUnsaved[lang]
        : copy.pixelSavedJustNow[lang]
  const saveButtonLabel = published ? copy.createSaveChanges[lang] : copy.createSaveDraft[lang]

  const zoomLabel = zoom === "fit" ? copy.pixelFit[lang] : `${Math.round(Number(zoom) * 10) / 10}×`
  const toolLabels: Record<Tool, string> = {
    pencil: copy.pixelSquareBrush[lang],
    circle: copy.pixelCircleBrush[lang],
    fill: copy.pixelFill[lang],
    polygon: copy.pixelPolygon[lang],
    line: copy.pixelLine[lang],
    rect: copy.pixelRect[lang],
    ellipse: copy.pixelEllipse[lang],
    bezier: copy.pixelBezier[lang],
    eraser: copy.pixelEraser[lang],
    eyedropper: copy.pixelEyedropper[lang],
    pan: copy.pixelMove[lang],
    text: copy.pixelTextTool[lang],
    gradient: copy.pixelGradient[lang],
    select: copy.pixelSelectBox[lang],
    selectContiguous: copy.pixelSelectContiguous[lang],
    selectColor: copy.pixelSelectColor[lang],
    lasso: copy.pixelSelectLasso[lang],
  }
  const toolLabel = toolLabels[tool]
  const showShapeOptions =
    tool === "rect" || tool === "ellipse" || tool === "bezier" || tool === "polygon"
  const showBrushControls =
    tool === "pencil" ||
    tool === "circle" ||
    tool === "eraser" ||
    tool === "line" ||
    tool === "bezier" ||
    tool === "text" ||
    showShapeOptions
  const showSymmetryControls = tool === "pencil" || tool === "circle" || tool === "eraser"
  const mobileBrushId = useId()
  const mobileSymmetryId = useId()

  const toolButton = (value: Tool, icon: PixelIconName, label: string, shortcut: string) => {
    const titled = copy.pixelToolWithShortcut[lang]
      .replace("{label}", label)
      .replace("{key}", shortcut)
    return (
      <button
        type="button"
        aria-label={titled}
        title={titled}
        aria-pressed={tool === value}
        onClick={() => setTool(value)}
        className={cn(
          "studio-hit border-[3px]",
          tool === value ? "border-fg bg-brick text-white" : "border-earth bg-card text-fg",
        )}
      >
        <PixelIcon name={icon} />
      </button>
    )
  }

  const toolDivider = (
    <div
      className="editor-tool-divider mx-0.5 hidden h-[3px] w-8 shrink-0 bg-earth md:block"
      aria-hidden="true"
    />
  )
  const toolDividerMobile = (
    <div
      className="editor-tool-divider mx-0.5 h-7 w-[2px] shrink-0 bg-earth md:hidden"
      aria-hidden="true"
    />
  )

  const toolButtons = (
    <>
      {toolButton("pencil", "square", copy.pixelSquareBrush[lang], "B")}
      {toolButton("circle", "circle", copy.pixelCircleBrush[lang], "C")}
      {toolButton("fill", "fill", copy.pixelFill[lang], "G")}
      {toolButton("polygon", "polygon", copy.pixelPolygon[lang], "P")}
      {toolButton("line", "line", copy.pixelLine[lang], "L")}
      {toolButton("rect", "rect", copy.pixelRect[lang], "U")}
      {toolButton("ellipse", "ellipse", copy.pixelEllipse[lang], "O")}
      {toolButton("bezier", "bezier", copy.pixelBezier[lang], "Q")}
      {toolButton("eraser", "eraser", copy.pixelEraser[lang], "E")}
      {toolDivider}
      {toolDividerMobile}
      {toolButton("eyedropper", "eyedropper", copy.pixelEyedropper[lang], "I")}
      {toolButton("pan", "pan", copy.pixelMove[lang], "H")}
      {toolDivider}
      {toolDividerMobile}
      {toolButton("text", "text", copy.pixelTextTool[lang], "T")}
      {toolButton("gradient", "gradient", copy.pixelGradient[lang], "N")}
      {toolDivider}
      {toolDividerMobile}
      {toolButton("select", "select", copy.pixelSelectBox[lang], "V")}
      {toolButton("selectContiguous", "wand", copy.pixelSelectContiguous[lang], "W")}
      {toolButton("selectColor", "colorSelect", copy.pixelSelectColor[lang], "K")}
      {toolButton("lasso", "lasso", copy.pixelSelectLasso[lang], "S")}
    </>
  )

  const sizeLabel = showShapeOptions
    ? copy.pixelStrokeWidth[lang]
    : tool === "text"
      ? copy.pixelTextSize[lang]
      : copy.pixelBrushSize[lang]
  const brushSelect = (fieldId: string) =>
    showBrushControls ? (
      <SizeSlider
        id={fieldId}
        label={sizeLabel}
        value={brushSize}
        onChange={(size) => {
          setBrushSize(size)
          if (shapeDraft.active) boardRef.current?.updateShapeDraft({ strokeWidth: size })
        }}
        className="min-w-0 flex-1 basis-[10rem]"
      />
    ) : null

  const shapeMobileOptions = showShapeOptions ? (
    <div className="studio-row w-full flex-wrap">
      {tool === "bezier" || tool === "polygon" ? (
        <>
          <Button
            type="button"
            variant={shapeDraft.mode === "stroke" ? "primary" : "outline"}
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.updateShapeDraft({ mode: "stroke" })}
          >
            {copy.pixelShapeStroke[lang]}
          </Button>
          <Button
            type="button"
            variant={shapeDraft.mode === "fill" ? "primary" : "outline"}
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.updateShapeDraft({ mode: "fill" })}
          >
            {copy.pixelShapeFill[lang]}
          </Button>
        </>
      ) : (
        <>
          <Button
            type="button"
            variant={!shapeDraft.filled ? "primary" : "outline"}
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.updateShapeDraft({ filled: false })}
          >
            {copy.pixelShapeOutline[lang]}
          </Button>
          <Button
            type="button"
            variant={shapeDraft.filled ? "primary" : "outline"}
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.updateShapeDraft({ filled: true })}
          >
            {copy.pixelShapeFilled[lang]}
          </Button>
          <label className="flex items-center gap-1 text-[12px] font-medium text-fg">
            {copy.pixelShapeWidth[lang]}
            <input
              type="number"
              min={1}
              value={shapeDraft.width || 1}
              onChange={(event) =>
                boardRef.current?.updateShapeDraft({
                  width: Math.max(1, Math.round(Number(event.target.value) || 1)),
                })
              }
              className="studio-control w-14 border-[3px] border-earth bg-card px-1 text-[12px]"
            />
          </label>
          <label className="flex items-center gap-1 text-[12px] font-medium text-fg">
            {copy.pixelShapeHeight[lang]}
            <input
              type="number"
              min={1}
              value={shapeDraft.height || 1}
              onChange={(event) =>
                boardRef.current?.updateShapeDraft({
                  height: Math.max(1, Math.round(Number(event.target.value) || 1)),
                })
              }
              className="studio-control w-14 border-[3px] border-earth bg-card px-1 text-[12px]"
            />
          </label>
        </>
      )}
      {shapeDraft.active ? (
        <>
          <Button
            type="button"
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.applyShapeDraft()}
          >
            {copy.pixelShapeApply[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="studio-control"
            onClick={() => boardRef.current?.cancelShapeDraft()}
          >
            {copy.pixelShapeCancel[lang]}
          </Button>
        </>
      ) : null}
    </div>
  ) : null

  const symmetrySelect = (fieldId: string) => (
    <>
      <label className="sr-only" htmlFor={fieldId}>
        {copy.pixelSymmetry[lang]}
      </label>
      <select
        id={fieldId}
        aria-label={copy.pixelSymmetry[lang]}
        value={symmetry}
        onChange={(event) => setSymmetry(event.target.value as PixelSymmetry)}
        className="studio-control max-w-[6.5rem] border-[3px] border-earth bg-card px-1.5 text-[12px] font-medium text-fg"
      >
        <option value="off">{copy.pixelSymmetryOff[lang]}</option>
        <option value="x">{copy.pixelSymmetryX[lang]}</option>
        <option value="y">{copy.pixelSymmetryY[lang]}</option>
        <option value="xy">{copy.pixelSymmetryXY[lang]}</option>
      </select>
    </>
  )

  const paletteRow = (
    <div className="studio-row">
      <div
        className="studio-row min-w-0 flex-1 overflow-x-auto pb-0.5"
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
              onClick={() => {
                setColor(swatch)
                if (tool === "eraser") setTool("pencil")
              }}
              className={cn(
                "pixel-swatch studio-hit border-[3px]",
                color === swatch ? "border-fg" : "border-earth",
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
      </div>
      <button
        type="button"
        aria-label={copy.pixelPaletteMore[lang]}
        onClick={() => {
          setPaletteFullAlert(false)
          setPaletteOpen(true)
        }}
        className="studio-hit border-[3px] border-earth bg-card"
      >
        <PixelIcon name="palette" />
      </button>
    </div>
  )

  const renderZoomWell = () => (
    <div
      className="studio-row shrink-0"
      role="toolbar"
      aria-label={copy.pixelViewControls[lang]}
    >
      <button
        type="button"
        aria-label={copy.pixelZoomOut[lang]}
        title={copy.pixelZoomOut[lang]}
        onClick={() => boardRef.current?.zoomBy(-1)}
        className="studio-hit border-[3px] border-earth bg-bg text-[16px] font-bold text-fg"
      >
        −
      </button>
      <span className="min-w-[2.5rem] text-center text-[12px] font-medium text-fg md:min-w-[3.25rem] md:text-[13px]">
        {zoomLabel}
      </span>
      <button
        type="button"
        aria-label={copy.pixelZoomIn[lang]}
        title={copy.pixelZoomIn[lang]}
        onClick={() => boardRef.current?.zoomBy(1)}
        className="studio-hit border-[3px] border-earth bg-bg text-[16px] font-bold text-fg"
      >
        +
      </button>
    </div>
  )

  const renderHistoryButtons = () => (
    <>
      <button
        type="button"
        aria-label={copy.pixelGridToggle[lang]}
        title={copy.pixelGridToggle[lang]}
        aria-pressed={gridVisible}
        onClick={() => setGridVisible((value) => !value)}
        className={cn(
          "studio-hit border-[3px]",
          gridVisible ? "border-fg bg-soft text-fg" : "border-earth bg-bg text-fg",
        )}
      >
        <PixelIcon name="grid" />
      </button>
      <button
        type="button"
        aria-label={copy.pixelUndo[lang]}
        title={`${copy.pixelUndo[lang]} (Ctrl+Z)`}
        disabled={!history.canUndo}
        onClick={() => boardRef.current?.undo()}
        className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
      >
        <PixelIcon name="undo" />
      </button>
      <button
        type="button"
        aria-label={copy.pixelRedo[lang]}
        title={`${copy.pixelRedo[lang]} (Ctrl+Y)`}
        disabled={!history.canRedo}
        onClick={() => boardRef.current?.redo()}
        className="studio-hit border-[3px] border-earth bg-bg text-fg disabled:opacity-40"
      >
        <PixelIcon name="redo" />
      </button>
    </>
  )

  const renderStatusBar = () =>
    preview ? null : (
      <div
        className="editor-status flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-t-[3px] border-earth bg-card px-2 py-1 text-[12px] text-muted"
        role="status"
        aria-label={copy.pixelStatusBar[lang]}
      >
        <span>
          {hoverCell
            ? `x ${hoverCell.x}, y ${hoverCell.y}`
            : copy.pixelCursorNone[lang]}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {toolLabel} {color}
        </span>
        <span aria-hidden="true">·</span>
        <span>{saveLabel}</span>
        {editFlash ? (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-fg">{editFlash}</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline">{copy.pixelStatusShortcuts[lang]}</span>
          </>
        )}
      </div>
    )

  const flashEdit = (message: string) => {
    if (editFlashTimer.current) clearTimeout(editFlashTimer.current)
    setEditFlash(message)
    editFlashTimer.current = setTimeout(() => {
      setEditFlash(null)
      editFlashTimer.current = null
    }, 1600)
  }

  const selectionActions = hasSelection || hasClipboard ? (
    <div className="studio-row w-full flex-wrap">
      {hasSelection ? (
        <>
          <button
            type="button"
            className="studio-hit border-[3px] border-earth bg-card text-fg"
            aria-label={copy.pixelCopy[lang]}
            title={copy.pixelCopy[lang]}
            onClick={() => boardRef.current?.copySelection()}
          >
            <PixelIcon name="duplicate" />
          </button>
          <button
            type="button"
            className="studio-hit border-[3px] border-earth bg-card text-fg"
            aria-label={copy.pixelCut[lang]}
            title={copy.pixelCut[lang]}
            onClick={() => boardRef.current?.cutSelection()}
          >
            <PixelIcon name="eraser" />
          </button>
          <button
            type="button"
            className="studio-hit border-[3px] border-earth bg-card text-fg"
            aria-label={copy.pixelRotate90[lang]}
            title={copy.pixelRotate90[lang]}
            onClick={() => boardRef.current?.rotateSelection(90)}
          >
            <PixelIcon name="rotate" />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="studio-hit border-[3px] border-earth bg-card text-fg disabled:opacity-40"
        aria-label={copy.pixelPaste[lang]}
        title={copy.pixelPaste[lang]}
        disabled={!hasClipboard}
        onClick={() => boardRef.current?.pasteClipboard()}
      >
        <PixelIcon name="download" />
      </button>
      {hasSelection ? (
        <button
          type="button"
          className="studio-hit border-[3px] border-earth bg-card text-fg"
          aria-label={copy.pixelDeleteSelection[lang]}
          title={copy.pixelDeleteSelection[lang]}
          onClick={() => boardRef.current?.deleteSelection()}
        >
          <PixelIcon name="trash" />
        </button>
      ) : null}
    </div>
  ) : null

  const flashLayer = useCallback(
    (kind: LayerPanelFeedback) => {
      const messages: Record<LayerPanelFeedback, string> = {
        added: copy.pixelLayerAdded[lang],
        deleted: copy.pixelLayerDeleted[lang],
        duplicated: copy.pixelLayerDuplicated[lang],
        merged: copy.pixelLayerMerged[lang],
        reordered: copy.pixelLayerReordered[lang],
        active: copy.pixelLayerActive[lang],
        locked: copy.pixelLayerLockedFlash[lang],
        max: copy.pixelLayerMax[lang],
      }
      flashEdit(messages[kind])
    },
    [lang],
  )

  const getLayerThumbnail = useCallback(
    (id: string) => boardRef.current?.getLayerThumbnail(id, 40) ?? null,
    [],
  )

  const layerApi = {
    getThumbnail: getLayerThumbnail,
    onAdd: () => boardRef.current?.addLayer() ?? false,
    onDelete: (id: string) => boardRef.current?.deleteLayer(id) ?? false,
    onDuplicate: (id: string) => boardRef.current?.duplicateLayer(id) ?? false,
    onMergeDown: (id: string) => boardRef.current?.mergeDown(id) ?? false,
    onMergeVisible: () => boardRef.current?.mergeVisible() ?? false,
    onActive: (id: string) => boardRef.current?.setActiveLayer(id) ?? false,
    onVisible: (id: string, visible: boolean) =>
      boardRef.current?.setLayerVisible(id, visible) ?? false,
    onLocked: (id: string, locked: boolean) => boardRef.current?.setLayerLocked(id, locked) ?? false,
    onRename: (id: string, name: string) => boardRef.current?.renameLayer(id, name) ?? false,
    onMove: (id: string, toStackIndex: number) => boardRef.current?.moveLayer(id, toStackIndex) ?? false,
    onFeedback: flashLayer,
  }

  const layerActions =
    layers.length > 0 ? (
      <LayerMobileStrip
        lang={lang}
        layers={layers}
        thumbEpoch={layerThumbEpoch}
        getThumbnail={layerApi.getThumbnail}
        onAdd={layerApi.onAdd}
        onActive={layerApi.onActive}
        onFeedback={flashLayer}
        onOpenSheet={setLayerSheetId}
      />
    ) : null

  return (
    <div
      data-chrome="playground"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden overscroll-none bg-bg"
    >
      {remixOf ? (
        <p className="shrink-0 border-b-[3px] border-earth bg-soft px-3 py-2 text-[13px] text-muted">
          {copy.remixFrom[lang]} @{remixOf.authorUsername}
          {" · "}
          <a href={href(lang, `/creation/${remixOf.id}`)} className="hover:text-fg">
            {displayTitle(remixOf.title, lang)}
          </a>
        </p>
      ) : null}
      <header className="playground-header flex shrink-0 items-center gap-2 border-b-[3px] border-earth bg-bg px-2 py-1.5 sm:px-3 sm:py-2">
        <button
          type="button"
          onClick={() => void leave()}
          disabled={leaving}
          aria-busy={leaving || undefined}
          aria-label={leaving ? copy.pixelLeaving[lang] : copy.pixelBack[lang]}
          title={leaving ? copy.pixelLeaving[lang] : copy.pixelBack[lang]}
          className="studio-hit border-[3px] border-earth bg-card text-fg disabled:opacity-50"
        >
          <PixelIcon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-[13px] font-medium text-fg md:text-[15px]"
            title={displayTitle(title, lang)}
          >
            {displayTitle(title, lang)}
          </p>
          <button
            type="button"
            className="mt-0 truncate text-[11px] text-muted hover:text-fg hover:underline md:text-[12px]"
            aria-label={copy.pixelCanvasSize[lang]}
            title={copy.pixelCanvasSize[lang]}
            onClick={() => setCanvasSizeOpen(true)}
          >
            {formatPixelSize(width, height)}
          </button>
        </div>
        {!preview ? <div className="hidden md:block">{renderZoomWell()}</div> : null}
        <div className="studio-row ml-auto shrink-0">
          {dirty || metadataDirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || leaving}
              aria-busy={(pending && busyIntent === "draft") || undefined}
              aria-label={
                pending && busyIntent === "draft" ? copy.pixelSaving[lang] : saveButtonLabel
              }
              title={pending && busyIntent === "draft" ? copy.pixelSaving[lang] : saveButtonLabel}
              onClick={() => void saveExplicit()}
              className="studio-hit shrink-0 !min-h-0 px-0 shadow-none"
            >
              <PixelIcon name="save" />
            </Button>
          ) : null}
          <Button
            type="button"
            disabled={pending || leaving}
            aria-busy={(pending && busyIntent === "publish") || undefined}
            aria-label={
              pending && busyIntent === "publish"
                ? copy.pixelPublishing[lang]
                : copy.createPublish[lang]
            }
            title={
              pending && busyIntent === "publish"
                ? copy.pixelPublishing[lang]
                : copy.createPublish[lang]
            }
            onClick={requestPublish}
            className="studio-hit shrink-0 !min-h-0 px-0 shadow-none"
          >
            <PixelIcon name="publish" />
          </Button>
          <button
            type="button"
            aria-label={copy.pixelMore[lang]}
            title={copy.pixelMore[lang]}
            onClick={() => {
              setRotateHint(false)
              setMoreOpen(true)
            }}
            className="studio-hit border-[3px] border-earth bg-card text-fg"
          >
            <PixelIcon name="more" />
          </button>
        </div>
      </header>

      {loadBroken ? (
        <div className="px-3 pt-2">
          <Alert tone="error">{copy.pixelLoadError[lang]}</Alert>
        </div>
      ) : null}
      {localDraftFailed ? (
        <div className="px-3 pt-2">
          <Alert tone="error">{copy.draftLocalSaveFailed[lang]}</Alert>
        </div>
      ) : null}
      {offline ? (
        <div className="px-3 pt-2">
          <Alert>{copy.pixelOffline[lang]}</Alert>
        </div>
      ) : errorState ? (
        <div className="px-3 pt-2">
          <Alert tone="error">{copy.errors[errorState.error][lang]}</Alert>
        </div>
      ) : null}
      {paletteFullAlert ? (
        <div className="px-3 pt-2">
          <Alert tone="error">{copy.pixelPaletteFullStroke[lang]}</Alert>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside
          className="playground-tool-rail hidden min-h-0 w-16 shrink-0 flex-col items-center gap-1.5 overflow-x-hidden overflow-y-auto border-r-[3px] border-earth bg-card p-1 md:flex"
          role="toolbar"
          aria-label={copy.pixelTools[lang]}
        >
          {toolButtons}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="playground-stage flex min-h-0 flex-1 flex-col px-2 py-2 sm:px-3">
            {preview && previewUrl ? (
              <PixelArt
                src={previewUrl}
                alt={copy.pixelPreviewAlt[lang]}
                variant="stage"
                fill
                className="min-h-0 flex-1"
              />
            ) : null}
            {boardReady ? (
              <PixelBoard
                key={boardEpoch}
                ref={boardRef}
                lang={lang}
                variant="studio"
                chrome={false}
                width={width}
                height={height}
                initialSource={boardSource}
                tool={tool}
                color={color}
                brushSize={brushSize}
                gridVisible={gridVisible}
                symmetry={symmetry}
                onToolChange={setTool}
                onColorChange={setColor}
                onBrushSizeChange={setBrushSize}
                onGridVisibleChange={setGridVisible}
                onSymmetryChange={setSymmetry}
                onZoomChange={setZoom}
                onSelectionChange={setHasSelection}
                onClipboardChange={setHasClipboard}
                onLayersChange={setLayers}
                onEditFeedback={(kind) => {
                  if (kind === "copied") flashEdit(copy.pixelCopied[lang])
                  else if (kind === "cut") flashEdit(copy.pixelCutDone[lang])
                  else if (kind === "pasted") flashEdit(copy.pixelPasted[lang])
                  else flashEdit(copy.pixelClipboardEmpty[lang])
                }}
                onShapeDraftChange={(info) => {
                  setShapeDraft(info)
                  if (info.active) setBrushSize(info.strokeWidth)
                }}
                onPaletteChange={setDocumentPalette}
                onPaletteFull={() => setPaletteFullAlert(true)}
                onStrokeEnd={() => {
                  scheduleLocalSourceDraft()
                  setLayerThumbEpoch((value) => value + 1)
                }}
                onHistoryChange={setHistory}
                onHoverCell={reportHover}
                onCanvasMenu={({ clientX, clientY }) => setCanvasMenu({ x: clientX, y: clientY })}
                className={cn(
                  preview ? "hidden" : "min-h-0 flex-1",
                  stageGround === "checker" && "pixel-stage-checker",
                )}
              />
            ) : (
              <div className={preview ? "hidden" : "min-h-0 flex-1"} aria-hidden="true" />
            )}
          </div>

          <div className="hidden md:block">{renderStatusBar()}</div>
        </div>

        {!preview ? (
          <StudioInspector
            lang={lang}
            color={color}
            documentPalette={documentPalette}
            brushSize={shapeDraft.active ? shapeDraft.strokeWidth : brushSize}
            symmetry={symmetry}
            hasSelection={hasSelection}
            hasClipboard={hasClipboard}
            layerPanel={
              layers.length > 0
                ? {
                    layers,
                    thumbEpoch: layerThumbEpoch,
                    ...layerApi,
                  }
                : undefined
            }
            showBrushControls={showBrushControls && !showShapeOptions}
            brushLabel={sizeLabel}
            showSymmetryControls={showSymmetryControls}
            showShapeOptions={showShapeOptions}
            shapeKind={
              tool === "rect" || tool === "ellipse" || tool === "bezier" || tool === "polygon"
                ? tool
                : null
            }
            shapeFilled={shapeDraft.filled}
            shapeMode={shapeDraft.mode}
            shapeWidth={shapeDraft.width}
            shapeHeight={shapeDraft.height}
            draftActive={shapeDraft.active}
            onColor={(hex) => {
              setColor(hex)
              if (tool === "eraser") setTool("pencil")
            }}
            onBrushSize={setBrushSize}
            onSymmetry={setSymmetry}
            onPaletteMore={() => {
              setPaletteFullAlert(false)
              setPaletteOpen(true)
            }}
            onCopy={() => boardRef.current?.copySelection()}
            onCut={() => boardRef.current?.cutSelection()}
            onPaste={() => boardRef.current?.pasteClipboard()}
            onDelete={() => boardRef.current?.deleteSelection()}
            onRotateSelection={(degrees) => boardRef.current?.rotateSelection(degrees)}
            onShapeFilled={(filled) => boardRef.current?.updateShapeDraft({ filled })}
            onShapeMode={(mode) => boardRef.current?.updateShapeDraft({ mode })}
            onShapeSize={(size) => {
              setBrushSize(size)
              boardRef.current?.updateShapeDraft({ strokeWidth: size })
            }}
            onShapeWidth={(width) => boardRef.current?.updateShapeDraft({ width })}
            onShapeHeight={(height) => boardRef.current?.updateShapeDraft({ height })}
            onShapeApply={() => boardRef.current?.applyShapeDraft()}
            onShapeCancel={() => boardRef.current?.cancelShapeDraft()}
          />
        ) : null}
      </div>

      <div className="md:hidden">{renderStatusBar()}</div>

      <div className="playground-toolbar shrink-0 border-t-[3px] border-earth bg-card px-2 pt-2 sm:px-3 md:hidden">
        <div className="studio-stack">
          {!preview ? (
            <div
              className="studio-row w-full overflow-x-auto pb-0.5"
              role="toolbar"
              aria-label={copy.pixelTools[lang]}
            >
              {renderZoomWell()}
              {toolDividerMobile}
              {renderHistoryButtons()}
              {toolDividerMobile}
              {toolButtons}
            </div>
          ) : (
            <div
              className="studio-row w-full overflow-x-auto pb-0.5"
              role="toolbar"
              aria-label={copy.pixelTools[lang]}
            >
              {toolButtons}
            </div>
          )}
          {showBrushControls || showSymmetryControls ? (
            <div className="studio-row w-full flex-wrap">
              {brushSelect(mobileBrushId)}
              {showSymmetryControls ? symmetrySelect(mobileSymmetryId) : null}
            </div>
          ) : null}
          {shapeMobileOptions}
          {selectionActions}
          {layerActions}
          {paletteRow}
        </div>
      </div>

      <StudioContextMenu
        lang={lang}
        open={Boolean(canvasMenu)}
        x={canvasMenu?.x ?? 0}
        y={canvasMenu?.y ?? 0}
        onClose={() => setCanvasMenu(null)}
        items={[
          {
            id: "undo",
            label: copy.pixelUndo[lang],
            disabled: !history.canUndo,
            onSelect: () => boardRef.current?.undo(),
          },
          {
            id: "redo",
            label: copy.pixelRedo[lang],
            disabled: !history.canRedo,
            onSelect: () => boardRef.current?.redo(),
          },
          {
            id: "select-all",
            label: copy.pixelSelectAll[lang],
            onSelect: () => boardRef.current?.selectAll(),
          },
          {
            id: "copy",
            label: copy.pixelCopy[lang],
            disabled: !hasSelection,
            onSelect: () => boardRef.current?.copySelection(),
          },
          {
            id: "cut",
            label: copy.pixelCut[lang],
            disabled: !hasSelection,
            onSelect: () => boardRef.current?.cutSelection(),
          },
          {
            id: "paste",
            label: copy.pixelPaste[lang],
            disabled: !hasClipboard,
            onSelect: () => boardRef.current?.pasteClipboard(),
          },
          {
            id: "delete",
            label: copy.pixelDeleteSelection[lang],
            disabled: !hasSelection,
            danger: true,
            onSelect: () => boardRef.current?.deleteSelection(),
          },
          {
            id: "fit",
            label: copy.pixelFit[lang],
            onSelect: () => boardRef.current?.fit(),
          },
          {
            id: "grid",
            label: copy.pixelGridToggle[lang],
            onSelect: () => setGridVisible((value) => !value),
          },
        ]}
      />

      <Dialog
        open={canvasSizeOpen}
        onClose={() => setCanvasSizeOpen(false)}
        title={copy.pixelCanvasSize[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] font-medium text-fg">{formatPixelSize(width, height)}</p>
        <p className="mt-2 text-[13px] text-muted">{copy.pixelCanvasSizeLocked[lang]}</p>
      </Dialog>

      <Dialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title={copy.pixelDiscard[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-fg">{copy.pixelDiscardConfirm[lang]}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setDiscardOpen(false)}>
            {copy.createCancel[lang]}
          </Button>
          <Button type="button" onClick={() => void discardUnsaved()}>
            {copy.pixelDiscard[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={copy.pixelMore[lang]} closeLabel={copy.closeMenu[lang]}>
        <div className="grid gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setMoreOpen(false)
              void togglePreview()
            }}
          >
            {preview ? copy.createEdit[lang] : copy.createPreview[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            aria-pressed={gridVisible}
            onClick={() => {
              setGridVisible((value) => !value)
              setMoreOpen(false)
            }}
          >
            {copy.pixelGridToggle[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMoreOpen(false)
              setCanvasSizeOpen(true)
            }}
          >
            {copy.pixelCanvasSize[lang]}
          </Button>
          {dirty || metadataDirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || leaving}
              onClick={() => {
                setMoreOpen(false)
                setDiscardOpen(true)
              }}
            >
              {copy.pixelDiscard[lang]}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMoreOpen(false)
              setDetailsOpen(true)
            }}
          >
            {copy.createDetailsMenu[lang]}
          </Button>
          <CreationMoreMenu
            lang={lang}
            creationId={creation.id}
            ownerId={creation.user_id}
            viewerId={creation.user_id}
            status={statusPublished ? "published" : "draft"}
            allowPngDownload={creation.allow_png_download}
            width={width}
            height={height}
            title={title}
            variant="embedded"
            getNativePng={getNativePng}
            onDownloaded={() => setMoreOpen(false)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMoreOpen(false)
              setPaletteManageOpen(true)
            }}
          >
            {copy.pixelPaletteManage[lang]}
          </Button>
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {hasSelection ? copy.pixelSelect[lang] : copy.pixelFit[lang]}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.flipHorizontal()
              setMoreOpen(false)
            }}
          >
            {copy.pixelFlipH[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.flipVertical()
              setMoreOpen(false)
            }}
          >
            {copy.pixelFlipV[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const ok = boardRef.current?.rotate90Cw() ?? false
              if (!ok) setRotateHint(true)
              else {
                setRotateHint(false)
                setMoreOpen(false)
              }
            }}
          >
            {copy.pixelRotate90[lang]}
          </Button>
          {rotateHint ? (
            <p className="text-[13px] text-brick">{copy.pixelRotateNeedSquare[lang]}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.clearCanvas()
              setMoreOpen(false)
            }}
          >
            {copy.pixelClearCanvas[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.fit()
              setMoreOpen(false)
            }}
          >
            {copy.pixelFit[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.zoomBy(1)
              setMoreOpen(false)
            }}
          >
            {copy.pixelZoomIn[lang]}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              boardRef.current?.zoomBy(-1)
              setMoreOpen(false)
            }}
          >
            {copy.pixelZoomOut[lang]}
          </Button>
          {published ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              aria-busy={(pending && busyIntent === "unpublish") || undefined}
              onClick={() => {
                void persist("unpublish")
                setMoreOpen(false)
              }}
            >
              {pending && busyIntent === "unpublish"
                ? copy.pixelUnpublishing[lang]
                : copy.createUnpublish[lang]}
            </Button>
          ) : null}
          {published ? (
            <a href={href(lang, `/creation/${creation.id}`)} className="text-[14px] text-muted hover:text-fg">
              {copy.createViewPublic[lang]}
            </a>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => { setMoreOpen(false); setConfirmDelete(true) }}>
            {copy.createDelete[lang]}
          </Button>
        </div>
      </Dialog>

      <ColorPicker
        lang={lang}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        value={color}
        documentPalette={documentPalette}
        onSelect={(hex) => {
          setPaletteFullAlert(false)
          setColor(hex)
          if (tool === "eraser") setTool("pencil")
        }}
      />

      <LayerMobileSheet
        lang={lang}
        open={layerSheetId !== null}
        layerId={layerSheetId}
        layers={layers}
        onClose={() => setLayerSheetId(null)}
        getThumbnail={layerApi.getThumbnail}
        onDelete={layerApi.onDelete}
        onDuplicate={layerApi.onDuplicate}
        onMergeDown={layerApi.onMergeDown}
        onMergeVisible={layerApi.onMergeVisible}
        onVisible={layerApi.onVisible}
        onLocked={layerApi.onLocked}
        onRename={layerApi.onRename}
        onMove={layerApi.onMove}
        onFeedback={flashLayer}
      />

      <DocumentPaletteDialog
        lang={lang}
        open={paletteManageOpen}
        onClose={() => setPaletteManageOpen(false)}
        palette={documentPalette}
        activeColor={color}
        onSelect={(hex) => {
          setPaletteFullAlert(false)
          setColor(hex)
          if (tool === "eraser") setTool("pencil")
        }}
        onReplace={(fromHex, toHex) => {
          boardRef.current?.replaceColor(fromHex, toHex)
          setColor(toHex)
          setPaletteFullAlert(false)
        }}
        onRemove={(hex) => {
          boardRef.current?.removeColor(hex)
          setDocumentPalette(boardRef.current?.getPalette() ?? documentPalette)
          if (color === hex) setColor(PIXEL_INK)
          setPaletteFullAlert(false)
        }}
      />

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={copy.createDetailsTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-[14px] font-medium text-fg">{copy.createCaptionLabel[lang]}</span>
            <textarea
              id="playground-caption"
              rows={4}
              maxLength={CREATION_CAPTION_MAX}
              value={caption}
              placeholder={copy.createCaptionPlaceholder[lang]}
              onChange={(event) => {
                const next = event.target.value
                setCaption(next)
                captionRef.current = next
                touchMetadata({ caption: next })
              }}
              className="w-full resize-y border-[3px] border-earth bg-card px-3 py-2 text-[14px] leading-snug text-fg outline-none placeholder:text-muted"
            />
            <span className="text-[13px] text-muted">{copy.createCaptionHint[lang]}</span>
          </label>
          <CreationTagInput
            lang={lang}
            id="playground-tags"
            value={tags}
            onChange={(next) => {
              setTags(next)
              tagsRef.current = next
              touchMetadata({ tags: next })
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={pending || (!metadataDirty && !dirty)}
              aria-busy={(pending && busyIntent === "draft") || undefined}
              onClick={() => {
                void saveExplicit().then((result) => {
                  if (result && "ok" in result) setDetailsOpen(false)
                })
              }}
            >
              {pending && busyIntent === "draft" ? copy.pixelSaving[lang] : saveButtonLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDetailsOpen(false)}>
              {copy.createDetailsDone[lang]}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        title={copy.worksNamePublishTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.worksNamePublishHint[lang]}</p>
        <label className="mt-4 block text-[13px] font-medium" htmlFor="publish-title">
          {copy.createTitleLabel[lang]}
        </label>
        <input
          id="publish-title"
          maxLength={CREATION_TITLE_MAX}
          value={publishName}
          placeholder={copy.worksNamePlaceholder[lang]}
          onChange={(event) => {
            setPublishName(event.target.value)
            setNameError(false)
          }}
          className="mt-2 w-full border-[3px] border-earth bg-card px-3 py-2 text-[15px] outline-none"
        />
        {nameError ? (
          <p className="mt-2 text-[13px] text-brick">{copy.errors.title_required[lang]}</p>
        ) : null}
        <label className="mt-4 grid gap-1.5">
          <span className="text-[13px] font-medium text-fg">{copy.createCaptionLabel[lang]}</span>
          <textarea
            id="publish-caption"
            rows={3}
            maxLength={CREATION_CAPTION_MAX}
            value={caption}
            placeholder={copy.createCaptionPlaceholder[lang]}
            onChange={(event) => {
              const next = event.target.value
              setCaption(next)
              captionRef.current = next
              touchMetadata({ caption: next })
            }}
            className="w-full resize-y border-[3px] border-earth bg-card px-3 py-2 text-[14px] outline-none placeholder:text-muted"
          />
        </label>
        <div className="mt-4">
          <CreationTagInput
            lang={lang}
            id="publish-tags"
            value={tags}
            onChange={(next) => {
              setTags(next)
              tagsRef.current = next
              touchMetadata({ tags: next })
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={pending}
            aria-busy={(pending && busyIntent === "publish") || undefined}
            onClick={confirmNameAndPublish}
          >
            {pending && busyIntent === "publish" ? copy.pixelPublishing[lang] : copy.createPublish[lang]}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setNameOpen(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={captionNudgeOpen}
        onClose={() => setCaptionNudgeOpen(false)}
        title={copy.worksPublishCaptionNudgeTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.worksPublishCaptionNudgeBody[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => {
              setCaptionNudgeOpen(false)
              setDetailsOpen(true)
            }}
          >
            {copy.worksPublishCaptionAdd[lang]}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              setCaptionNudgeOpen(false)
              runPublish()
            }}
          >
            {copy.worksPublishCaptionSkip[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={publishDoneOpen}
        onClose={() => setPublishDoneOpen(false)}
        title={copy.worksPublishDoneTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.worksPublishDoneBody[lang]}</p>
        {!captionRef.current.trim() ? (
          <p className="mt-2 text-[13px] text-muted">{copy.worksPublishAddCaptionHint[lang]}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={href(lang, `/creation/${creation.id}`)} className={buttonClassName()}>
            {copy.worksViewWork[lang]}
          </a>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}${href(lang, `/creation/${creation.id}`)}`
                  : href(lang, `/creation/${creation.id}`)
              void navigator.clipboard?.writeText(url)
            }}
          >
            <PixelIcon name="share" />
            {copy.share[lang]}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setPublishDoneOpen(false)}>
            {copy.worksKeepEditing[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        title={copy.pixelLeaveUnsavedTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.pixelLeaveUnsavedBody[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" disabled={leaving || pending} onClick={() => void leaveSaveAndGo()}>
            {leaving || (pending && busyIntent === "draft")
              ? copy.pixelLeaving[lang]
              : saveButtonLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={leaveWithoutSaving}>
            {copy.pixelLeaveDiscard[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={leaveBlockedOpen}
        onClose={() => setLeaveBlockedOpen(false)}
        title={copy.pixelLeaveBlockedTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.pixelLeaveBlockedBody[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" disabled={leaving || pending} onClick={retryLeave}>
            {leaving ? copy.pixelLeaving[lang] : copy.pixelLeaveRetry[lang]}
          </Button>
          <Button type="button" variant="secondary" onClick={leaveWithoutSaving}>
            {copy.pixelLeaveDiscard[lang]}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={copy.createDelete[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <DeleteCreationCopy
          lang={lang}
          title={title.trim() ? title.trim() : displayTitle(creation.title, lang)}
          published={statusPublished}
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={deleteCreationAction}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={creation.id} />
            <PlaygroundDeleteSubmit lang={lang} />
          </form>
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
