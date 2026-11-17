"use client"

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import {
  updateAllowPngDownloadAction,
  type CreationActionState,
} from "@/features/creations/actions"
import { canDownloadCreationPng } from "@/lib/auth/permissions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { exportPngForDownloadClient } from "@/lib/pixel-export-client"
import {
  downloadExportOptions,
  downloadFilenameSuffix,
  downloadModeOutputSize,
  formatDownloadEstimateBytes,
  resolveDownloadExportMode,
  triggerPngDownload,
  type DownloadBackground,
  type DownloadExportMode,
  type DownloadExportOption,
} from "@/lib/pixel-png-scale"
import { cn } from "@/lib/utils"

function pngFilename(
  title: string,
  creationId: string,
  mode: DownloadExportMode,
  background: DownloadBackground,
) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
  const stem = base || `artwork-${creationId.slice(0, 8)}`
  return `${stem}${downloadFilenameSuffix(mode, background)}.png`
}

function fitLabel(lang: Lang, id: DownloadExportOption & { kind: "fit" }) {
  const name =
    id.id === "1080p" ? copy.downloadFit1080p[lang] : copy.downloadFit1440p[lang]
  return copy.downloadFitOption[lang]
    .replace("{label}", name)
    .replace("{size}", `${id.targetW}×${id.targetH}`)
}

export function CreationMoreMenu({
  lang,
  creationId,
  ownerId,
  viewerId,
  status,
  allowPngDownload: initialAllow,
  width,
  height,
  title = "",
  variant = "detail",
  /** Playground: return live native PNG blob (works before cover.png exists). */
  getNativePng,
  onDownloaded,
}: {
  lang: Lang
  creationId: string
  ownerId: string
  viewerId: string | null
  status: "draft" | "published" | "hidden"
  allowPngDownload: boolean
  width: number
  height: number
  title?: string
  /** detail = ⋯ control on the public page; embedded = panel body for Playground More */
  variant?: "detail" | "embedded"
  getNativePng?: () => Promise<Blob>
  onDownloaded?: () => void
}) {
  const isOwner = Boolean(viewerId && viewerId === ownerId)
  const [open, setOpen] = useState(false)
  const [allow, setAllow] = useState(initialAllow)
  const [optionKey, setOptionKey] = useState("scale-1")
  const [background, setBackground] = useState<DownloadBackground>("transparent")
  const [estimateLabel, setEstimateLabel] = useState<string | null>(null)
  const [downloadPending, setDownloadPending] = useState(false)
  const [downloadError, setDownloadError] = useState(false)
  const [permState, permAction, permPending] = useActionState(
    updateAllowPngDownloadAction,
    null as CreationActionState,
  )
  const [, startTransition] = useTransition()
  const estimateTimer = useRef<number | null>(null)
  const estimateSeq = useRef(0)
  const apiNativeCache = useRef<Blob | null>(null)

  const options = useMemo(() => downloadExportOptions(width, height), [width, height])
  const mode = useMemo(
    () => resolveDownloadExportMode(options, optionKey) ?? { kind: "scale" as const, scale: 1 },
    [options, optionKey],
  )

  useEffect(() => {
    apiNativeCache.current = null
  }, [creationId])

  useEffect(() => {
    if (!permPending) setAllow(initialAllow)
  }, [initialAllow, permPending])

  useEffect(() => {
    if (permState && "error" in permState) setAllow(initialAllow)
  }, [permState, initialAllow])

  useEffect(() => {
    if (!options.some((item) => item.key === optionKey)) setOptionKey("scale-1")
  }, [options, optionKey])

  const canDownload = canDownloadCreationPng({
    viewerId,
    ownerId,
    status,
    allowPngDownload: allow,
  })

  async function resolveNativePng(): Promise<Blob> {
    if (getNativePng) return getNativePng()
    if (apiNativeCache.current) return apiNativeCache.current
    const res = await fetch(`/api/pixel-download/${creationId}`, { credentials: "same-origin" })
    if (!res.ok) throw new Error("fetch")
    const blob = await res.blob()
    apiNativeCache.current = blob
    return blob
  }

  const estimateReady = canDownload && (variant === "embedded" ? Boolean(getNativePng) : open)

  useEffect(() => {
    if (!estimateReady) {
      setEstimateLabel(null)
      return
    }
    if (estimateTimer.current) window.clearTimeout(estimateTimer.current)
    const seq = ++estimateSeq.current
    const exportMode = mode
    const exportBg = background
    estimateTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const native = await resolveNativePng()
          const exported = await exportPngForDownloadClient(native, exportMode, exportBg)
          if (seq !== estimateSeq.current) return
          setEstimateLabel(formatDownloadEstimateBytes(exported.size))
        } catch {
          if (seq !== estimateSeq.current) return
          setEstimateLabel(null)
        }
      })()
    }, 280)
    return () => {
      if (estimateTimer.current) window.clearTimeout(estimateTimer.current)
    }
    // resolveNativePng closes over latest getNativePng / creationId
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional option/open gated refresh
  }, [estimateReady, optionKey, creationId, getNativePng, mode, background])

  if (!isOwner && !canDownload) return null

  function setAllowPngDownload(next: boolean) {
    if (!isOwner || next === allow) return
    setAllow(next)
    const data = new FormData()
    data.set("lang", lang)
    data.set("id", creationId)
    data.set("allow_png_download", next ? "true" : "false")
    startTransition(() => {
      permAction(data)
    })
  }

  async function downloadScaled() {
    if (downloadPending) return
    if (!resolveDownloadExportMode(options, optionKey)) return
    setDownloadPending(true)
    setDownloadError(false)
    try {
      const native = await resolveNativePng()
      const out = await exportPngForDownloadClient(native, mode, background)
      triggerPngDownload(out, pngFilename(title, creationId, mode, background))
      onDownloaded?.()
    } catch {
      setDownloadError(true)
    } finally {
      setDownloadPending(false)
    }
  }

  const out = downloadModeOutputSize(width, height, mode)
  const sizeLabel = `${out.width}×${out.height}`

  const body = (
    <div className="grid gap-3">
      {canDownload ? (
        <div className="grid gap-2">
          <label className="grid gap-1.5" htmlFor={`download-size-${creationId}`}>
            <span className="text-[14px] font-medium text-fg">{copy.downloadScaleLabel[lang]}</span>
            <select
              id={`download-size-${creationId}`}
              className="min-h-11 border-[3px] border-earth bg-card px-3 text-[14px] text-fg"
              value={optionKey}
              onChange={(event) => setOptionKey(event.target.value)}
            >
              {options.map((option) => {
                const label =
                  option.kind === "scale"
                    ? copy.downloadScaleOption[lang]
                        .replace("{scale}", String(option.scale))
                        .replace("{size}", `${option.width}×${option.height}`)
                    : fitLabel(lang, option)
                return (
                  <option key={option.key} value={option.key}>
                    {label}
                  </option>
                )
              })}
            </select>
          </label>
          <label className="grid gap-1.5" htmlFor={`download-bg-${creationId}`}>
            <span className="text-[14px] font-medium text-fg">{copy.downloadBgLabel[lang]}</span>
            <select
              id={`download-bg-${creationId}`}
              className="min-h-11 border-[3px] border-earth bg-card px-3 text-[14px] text-fg"
              value={background}
              onChange={(event) => setBackground(event.target.value as DownloadBackground)}
            >
              <option value="transparent">{copy.downloadBgTransparent[lang]}</option>
              <option value="solid">{copy.downloadBgSolid[lang]}</option>
            </select>
          </label>
          <p className="text-[13px] text-muted">{copy.downloadScaleHint[lang]}</p>
          <p className="text-[13px] text-muted" aria-live="polite">
            {sizeLabel}
            {estimateLabel
              ? ` · ${copy.downloadEstimate[lang].replace("{size}", estimateLabel)}`
              : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={downloadPending}
            aria-busy={downloadPending || undefined}
            onClick={() => void downloadScaled()}
          >
            <PixelIcon name="download" />
            {downloadPending ? copy.downloadWorking[lang] : copy.downloadArtwork[lang]}
          </Button>
          {downloadError ? (
            <p className="text-[13px] text-brick" role="status">
              {copy.downloadFailed[lang]}
            </p>
          ) : null}
        </div>
      ) : null}
      {isOwner ? (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[14px] leading-snug">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--brick)]"
            checked={allow}
            disabled={permPending}
            onChange={(event) => setAllowPngDownload(event.target.checked)}
          />
          <span>
            <span className="block font-medium text-fg">{copy.allowPngDownload[lang]}</span>
            <span className="mt-1 block text-[13px] text-muted">{copy.downloadDisclaimer[lang]}</span>
          </span>
        </label>
      ) : canDownload ? (
        <p className="text-[13px] text-muted">{copy.downloadDisclaimer[lang]}</p>
      ) : null}
      {permState && "error" in permState ? (
        <p className="text-[13px] text-brick" role="status">
          {copy.downloadPermissionFailed[lang]}
        </p>
      ) : null}
    </div>
  )

  if (variant === "embedded") return body

  return (
    <div>
      <button
        type="button"
        aria-label={copy.pixelMore[lang]}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center border-[3px] border-earth bg-card text-fg",
          "shadow-[4px_4px_0_0_var(--fg)]",
        )}
      >
        <PixelIcon name="more" />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.pixelMore[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        {body}
        <div className="mt-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            {copy.closeMenu[lang]}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
