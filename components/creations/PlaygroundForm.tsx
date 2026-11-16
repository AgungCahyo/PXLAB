"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PixelBoard, type PixelBoardHandle } from "@/components/canvas/PixelBoard"
import { ColorPicker } from "@/components/creations/ColorPicker"
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
import { isUnnamedTitle, titleForStorage } from "@/lib/creations"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { PIXEL_INK, PIXEL_PALETTE, PIXEL_PAPER, type PixelSourceV1 } from "@/lib/pixel"
import { CREATION_TITLE_MAX, PIXEL_PNG_MAX_BYTES, PIXEL_SOURCE_MAX_BYTES } from "@/lib/site"
import { pixelContentSchema } from "@/lib/validations/creation"
import { cn } from "@/lib/utils"

type Tool = "pencil" | "eraser" | "pan"
type SaveStatus = "saved" | "saving" | "unsaved"

const AUTOSAVE_MS = 1200

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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const [publishName, setPublishName] = useState("")
  const [nameError, setNameError] = useState(false)
  const [publishDoneOpen, setPublishDoneOpen] = useState(false)
  const [title, setTitle] = useState(isUnnamedTitle(creation.title) ? "" : creation.title)
  const [statusPublished, setStatusPublished] = useState(creation.status === "published")
  const [tool, setTool] = useState<Tool>("pencil")
  const startingPalette = initialSource?.palette?.length
    ? [...initialSource.palette]
    : header.success
      ? [...header.data.palette]
      : [...PIXEL_PALETTE]
  const [color, setColor] = useState(
    startingPalette.find((item) => item !== PIXEL_PAPER) ?? PIXEL_INK,
  )
  const [documentPalette, setDocumentPalette] = useState<string[]>(startingPalette)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [state, setState] = useState<CreationActionState>(null)
  const [clientError, setClientError] = useState<CreationActionState>(null)
  const [offline, setOffline] = useState(false)
  const timerRef = useRef<number>(0)
  const persistRef = useRef<
    (intent: "draft" | "publish" | "unpublish", silent?: boolean) => Promise<CreationActionState>
  >(async () => null)
  dirtyRef.current = dirty
  pendingRef.current = pending

  const published = statusPublished
  const titleRef = useRef(title)
  titleRef.current = title

  const markDirty = () => {
    editGen.current += 1
    dirtyRef.current = true
    setDirty(true)
  }

  const persist = (intent: "draft" | "publish" | "unpublish", silent = false) => {
    const job = flightRef.current.then(async (): Promise<CreationActionState> => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOffline(true)
        dirtyRef.current = true
        setDirty(true)
        return null
      }
      if (!silent) setClientError(null)
      setPending(true)
      pendingRef.current = true
      const savedGen = editGen.current
      try {
        const nextTitle =
          intent === "publish" ? titleRef.current.trim() : titleForStorage(titleRef.current)
        if (intent === "publish" && isUnnamedTitle(nextTitle)) {
          const error = { error: "title_required" as const }
          if (!silent) setClientError(error)
          return error
        }
        const formData = new FormData()
        formData.set("lang", lang)
        formData.set("id", creation.id)
        formData.set("title", nextTitle)
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
          dirtyRef.current = true
          setDirty(true)
          if (!silent) setClientError(result)
          return result
        }
        if (result && "ok" in result) {
          if (intent === "publish") setStatusPublished(true)
          if (intent === "unpublish") setStatusPublished(false)
        }
        if (editGen.current === savedGen) {
          dirtyRef.current = false
          setDirty(false)
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
      }
    })
    flightRef.current = job.then(
      () => undefined,
      () => undefined,
    )
    return job
  }
  persistRef.current = persist

  const scheduleAutosave = () => {
    markDirty()
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void persist("draft", true)
    }, AUTOSAVE_MS)
  }

  const leave = async () => {
    window.clearTimeout(timerRef.current)
    setLeaving(true)
    const gen = editGen.current
    const result = dirtyRef.current || pendingRef.current ? await persist("draft") : { ok: true as const, published }
    if (!result || "error" in result || editGen.current !== gen) {
      setLeaving(false)
      return
    }
    router.push(href(lang, "/dashboard"))
  }

  const requestPublish = () => {
    if (!titleRef.current.trim() || isUnnamedTitle(titleRef.current)) {
      setPublishName("")
      setNameError(false)
      setNameOpen(true)
      return
    }
    void persist("publish").then((result) => {
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
    setNameOpen(false)
    markDirty()
    void persist("publish").then((result) => {
      if (result && "ok" in result && result.published) setPublishDoneOpen(true)
    })
  }

  useEffect(() => {
    document.body.classList.add("playground-open")
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !pendingRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    const showOffline = () => setOffline(true)
    const resume = () => {
      setOffline(false)
      if (dirtyRef.current) void persistRef.current("draft", true)
    }
    if (typeof navigator !== "undefined") setOffline(!navigator.onLine)
    window.addEventListener("beforeunload", warn)
    window.addEventListener("offline", showOffline)
    window.addEventListener("online", resume)
    return () => {
      window.clearTimeout(timerRef.current)
      window.removeEventListener("beforeunload", warn)
      window.removeEventListener("offline", showOffline)
      window.removeEventListener("online", resume)
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
    : dirty || (state && "error" in state)
      ? "unsaved"
      : "saved"
  const saveLabel =
    saveStatus === "saving"
      ? copy.pixelSaving[lang]
      : saveStatus === "unsaved"
        ? copy.pixelUnsaved[lang]
        : copy.pixelSavedJustNow[lang]

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
      className="fixed inset-x-0 bottom-0 top-[66px] z-40 flex flex-col overflow-hidden overscroll-none bg-bg"
    >
      <header className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b-[3px] border-earth px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={() => void leave()}
          disabled={leaving}
          aria-label={copy.pixelBack[lang]}
          className="inline-flex h-11 items-center gap-1.5 border-[3px] border-earth bg-card px-2 text-fg disabled:opacity-50 sm:px-3"
        >
          <PixelIcon name="back" />
          <span className="hidden text-[13px] font-medium sm:inline">{copy.pixelBack[lang]}</span>
        </button>
        <div className="min-w-0">
          <input
            id="playground-title"
            aria-label={copy.createTitleLabel[lang]}
            maxLength={CREATION_TITLE_MAX}
            value={title}
            placeholder={copy.worksNamePlaceholder[lang]}
            onChange={(event) => {
              setTitle(event.target.value)
              scheduleAutosave()
            }}
            className="w-full min-w-0 border-[3px] border-earth bg-card px-2 py-1.5 text-[15px] font-medium outline-none placeholder:text-muted"
          />
          <p className="mt-1 text-[12px] text-muted">
            {published ? copy.createPublishedBadge[lang] : copy.createDraftBadge[lang]}
            {` · ${saveLabel} · ${width} × ${height}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => void togglePreview()} disabled={pending}>
            {preview ? copy.createEdit[lang] : copy.createPreview[lang]}
          </Button>
          <Button type="button" size="sm" disabled={pending || leaving} onClick={requestPublish}>
            {copy.createPublish[lang]}
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
        <PixelBoard
          ref={boardRef}
          lang={lang}
          variant="studio"
          chrome={false}
          width={width}
          height={height}
          initialSource={initialSource}
          tool={tool}
          color={color}
          onToolChange={setTool}
          onColorChange={setColor}
          onPaletteChange={setDocumentPalette}
          onStrokeEnd={scheduleAutosave}
          onHistoryChange={setHistory}
          className={preview ? "hidden" : "min-h-0 flex-1"}
        />
      </div>

      <div className="shrink-0 border-t-[3px] border-earth bg-card px-2 py-2 sm:px-3">
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
          <Button type="button" variant="outline" onClick={() => { boardRef.current?.fit(); setMoreOpen(false) }}>
            {copy.pixelFit[lang]}
          </Button>
          <Button type="button" variant="outline" onClick={() => boardRef.current?.zoomBy(1)}>
            {copy.pixelZoomIn[lang]}
          </Button>
          <Button type="button" variant="outline" onClick={() => boardRef.current?.zoomBy(-1)}>
            {copy.pixelZoomOut[lang]}
          </Button>
          {published ? (
            <Button type="button" variant="outline" disabled={pending} onClick={() => { void persist("unpublish"); setMoreOpen(false) }}>
              {copy.createUnpublish[lang]}
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
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" disabled={pending} onClick={confirmNameAndPublish}>
            {copy.createPublish[lang]}
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
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={copy.createDelete[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.createDeleteConfirm[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={deleteCreationAction}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={creation.id} />
            <Button type="submit" variant="primary">
              {copy.createDelete[lang]}
            </Button>
          </form>
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
