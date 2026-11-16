"use client"

import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { PixelBoard, type PixelBoardHandle } from "@/components/canvas/PixelBoard"
import { ColorPicker } from "@/components/creations/ColorPicker"
import { CreationTagInput } from "@/components/creations/CreationTagInput"
import { DeleteCreationCopy } from "@/components/creations/DeleteCreationCopy"
import { PixelArt } from "@/components/creations/PixelArt"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import {
  deleteCreationAction,
  updatePixelCreationAction,
  type CreationActionState,
} from "@/features/creations/actions"
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
import { PIXEL_INK, PIXEL_PALETTE, PIXEL_PAPER, type PixelSourceV1 } from "@/lib/pixel"
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

type Tool = "pencil" | "eraser" | "pan"
type SaveStatus = "saved" | "saving" | "unsaved"

/** Debounce browser-local pixel draft writes only — never hits the database. */
const LOCAL_SOURCE_MS = 400

export function PlaygroundForm({
  lang,
  creation,
  initialSource,
  loadBroken,
}: {
  lang: Lang
  creation: CreationRow
  initialSource: PixelSourceV1 | null
  loadBroken: boolean
}) {
  const header = pixelContentSchema.safeParse(creation.content)
  const width = header.success ? header.data.width : 64
  const height = header.success ? header.data.height : 64

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
  const [title, setTitle] = useState(isUnnamedTitle(creation.title) ? "" : creation.title)
  const [caption, setCaption] = useState(creation.caption ?? "")
  const [tags, setTags] = useState<string[]>(creation.tags ?? [])
  const [statusPublished, setStatusPublished] = useState(creation.status === "published")
  const [tool, setTool] = useState<Tool>("pencil")
  const serverPalette = initialSource?.palette?.length
    ? [...initialSource.palette]
    : header.success
      ? [...header.data.palette]
      : [...PIXEL_PALETTE]
  const [color, setColor] = useState(
    serverPalette.find((item) => item !== PIXEL_PAPER) ?? PIXEL_INK,
  )
  const [documentPalette, setDocumentPalette] = useState<string[]>(serverPalette)
  const [boardSource, setBoardSource] = useState<PixelSourceV1 | null>(initialSource)
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
      try {
        writeLocalCreationSource(creation.id, board.exportSource())
      } catch {
        /* ignore export failures while drafting locally */
      }
    }, LOCAL_SOURCE_MS)
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
              clearLocalCreationSource(creation.id)
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

  const leave = async (dest = href(lang, "/dashboard")) => {
    leaveDestRef.current = dest
    window.clearTimeout(localSourceTimerRef.current)
    if (!hasUnsavedWork()) {
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
    clearLocalCreationDraft(creation.id)
    setLeaveConfirmOpen(false)
    setLeaveBlockedOpen(false)
    setLeaving(false)
    leavingRef.current = false
    router.push(leaveDestRef.current)
  }

  const retryLeave = () => {
    setLeaveBlockedOpen(false)
    void leaveSaveAndGo()
  }

  const requestPublish = () => {
    if (!titleRef.current.trim() || isUnnamedTitle(titleRef.current)) {
      setPublishName("")
      setNameError(false)
      setNameOpen(true)
      return
    }
    void persist("publish", { commitMetadata: true }).then((result) => {
      if (result && "ok" in result && result.published) setPublishDoneOpen(true)
    })
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
    void persist("publish", { commitMetadata: true }).then((result) => {
      if (result && "ok" in result && result.published) setPublishDoneOpen(true)
    })
  }

  useEffect(() => {
    const localMeta = readLocalCreationMetadata(creation.id)
    if (localMeta) {
      setTitle(localMeta.title)
      setCaption(localMeta.caption)
      setTags(localMeta.tags)
      titleRef.current = localMeta.title
      captionRef.current = localMeta.caption
      tagsRef.current = localMeta.tags
      metadataDirtyRef.current = true
      setMetadataDirty(true)
    }

    const localSource = readLocalCreationSource(creation.id)
    if (localSource && localSource.width === width && localSource.height === height) {
      setBoardSource(localSource)
      if (localSource.palette?.length) {
        setDocumentPalette([...localSource.palette])
        setColor(localSource.palette.find((item) => item !== PIXEL_PAPER) ?? PIXEL_INK)
      }
      dirtyRef.current = true
      setDirty(true)
    } else {
      setBoardSource(initialSource)
    }
    setBoardReady(true)
  }, [creation.id, height, initialSource, width])

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
      window.removeEventListener("beforeunload", warn)
      window.removeEventListener("offline", showOffline)
      window.removeEventListener("online", resume)
      document.removeEventListener("click", guardChromeNav, true)
      document.body.classList.remove("playground-open")
    }
  }, [])

  const togglePreview = async () => {
    if (preview) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setPreview(false)
      return
    }
    const board = boardRef.current
    if (!board) return
    try {
      const png = await board.exportPng()
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

  const toolButton = (value: Tool, icon: "pencil" | "eraser" | "pan", label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={tool === value}
      onClick={() => setTool(value)}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center border-[3px]",
        tool === value ? "border-fg bg-brick text-white" : "border-earth bg-card text-fg",
      )}
    >
      <PixelIcon name={icon} />
    </button>
  )

  return (
    <div
      data-chrome="playground"
      className="fixed inset-x-0 bottom-0 top-0 z-40 flex flex-col overflow-hidden overscroll-none bg-bg md:top-[66px]"
    >
      <header className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b-[3px] border-earth px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={() => void leave()}
          disabled={leaving}
          aria-busy={leaving || undefined}
          aria-label={leaving ? copy.pixelLeaving[lang] : copy.pixelBack[lang]}
          className="inline-flex h-11 items-center gap-1.5 border-[3px] border-earth bg-card px-2 text-fg disabled:opacity-50 sm:px-3"
        >
          <PixelIcon name="back" />
          <span className="hidden text-[13px] font-medium sm:inline">
            {leaving ? copy.pixelLeaving[lang] : copy.pixelBack[lang]}
          </span>
        </button>
        <div className="min-w-0">
          <input
            id="playground-title"
            aria-label={copy.createTitleLabel[lang]}
            maxLength={CREATION_TITLE_MAX}
            value={title}
            placeholder={copy.worksNamePlaceholder[lang]}
            onChange={(event) => {
              const next = event.target.value
              setTitle(next)
              titleRef.current = next
              touchMetadata({ title: next })
            }}
            className="w-full min-w-0 border-[3px] border-earth bg-card px-2 py-1.5 text-[15px] font-medium outline-none placeholder:text-muted"
          />
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <span>{published ? copy.createPublishedBadge[lang] : copy.createDraftBadge[lang]}</span>
            <span aria-hidden="true">·</span>
            <span role="status" aria-live="polite">
              {saveLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {width} × {height}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {dirty || metadataDirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending || leaving}
              aria-busy={(pending && busyIntent === "draft") || undefined}
              onClick={() => void saveExplicit()}
            >
              {pending && busyIntent === "draft" ? copy.pixelSaving[lang] : saveButtonLabel}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => void togglePreview()} disabled={pending}>
            {preview ? copy.createEdit[lang] : copy.createPreview[lang]}
          </Button>
          <Button
            type="button"
            disabled={pending || leaving}
            aria-busy={(pending && busyIntent === "publish") || undefined}
            onClick={requestPublish}
          >
            {pending && busyIntent === "publish" ? copy.pixelPublishing[lang] : copy.createPublish[lang]}
          </Button>
        </div>
      </header>

      {loadBroken ? (
        <div className="px-3 pt-2">
          <Alert tone="error">{copy.pixelLoadError[lang]}</Alert>
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

      <div className="flex min-h-0 flex-1 flex-col px-2 py-2 sm:px-3">
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
            ref={boardRef}
            lang={lang}
            variant="studio"
            chrome={false}
            width={width}
            height={height}
            initialSource={boardSource}
            tool={tool}
            color={color}
            onToolChange={setTool}
            onColorChange={setColor}
            onPaletteChange={setDocumentPalette}
            onStrokeEnd={scheduleLocalSourceDraft}
            onHistoryChange={setHistory}
            className={preview ? "hidden" : "min-h-0 flex-1"}
          />
        ) : (
          <div className={preview ? "hidden" : "min-h-0 flex-1"} aria-hidden="true" />
        )}
      </div>

      <div className="playground-toolbar shrink-0 border-t-[3px] border-earth bg-card px-2 pt-2 sm:px-3">
        <div className="flex items-center justify-center gap-2">
          {toolButton("pencil", "pencil", copy.pixelPencil[lang])}
          {toolButton("eraser", "eraser", copy.pixelEraser[lang])}
          {toolButton("pan", "pan", copy.pixelPan[lang])}
          <button
            type="button"
            aria-label={copy.pixelUndo[lang]}
            disabled={!history.canUndo}
            onClick={() => boardRef.current?.undo()}
            className="inline-flex h-11 w-11 items-center justify-center border-[3px] border-earth bg-card text-fg disabled:opacity-40"
          >
            <PixelIcon name="undo" />
          </button>
          <button
            type="button"
            aria-label={copy.pixelRedo[lang]}
            disabled={!history.canRedo}
            onClick={() => boardRef.current?.redo()}
            className="inline-flex h-11 w-11 items-center justify-center border-[3px] border-earth bg-card text-fg disabled:opacity-40"
          >
            <PixelIcon name="redo" />
          </button>
          <button
            type="button"
            aria-label={copy.pixelMore[lang]}
            onClick={() => setMoreOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center border-[3px] border-earth bg-card text-fg"
          >
            <PixelIcon name="more" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1"
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
                  "pixel-swatch h-11 w-11 shrink-0 border-[3px]",
                  color === swatch ? "border-fg" : "border-earth",
                )}
                style={{ backgroundColor: swatch }}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={copy.pixelPaletteMore[lang]}
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-earth bg-card"
          >
            <PixelIcon name="palette" />
          </button>
        </div>
      </div>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title={copy.pixelMore[lang]} closeLabel={copy.closeMenu[lang]}>
        <div className="grid gap-3">
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
          setColor(hex)
          if (tool === "eraser") setTool("pencil")
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
        open={publishDoneOpen}
        onClose={() => setPublishDoneOpen(false)}
        title={copy.worksPublishDoneTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.worksPublishDoneBody[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={href(lang, `/creation/${creation.id}`)} className={buttonClassName()}>
            {copy.worksViewWork[lang]}
          </a>
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
