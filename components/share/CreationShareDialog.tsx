"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  creationCanonicalUrl,
  creationQrPath,
  creationSocialExportPath,
  platformShareUrl,
  type ShareExportFormat,
  type ShareIntentPlatform,
} from "@/lib/share"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onClose: () => void
  lang: Lang
  creationId: string
  title: string
  creatorLabel: string
  coverUrl: string | null
  allowArtworkDownload: boolean
  isPixel: boolean
}

const PLATFORMS: { id: ShareIntentPlatform; label: { id: string; en: string } }[] = [
  { id: "whatsapp", label: copy.shareWhatsApp },
  { id: "facebook", label: copy.shareFacebook },
  { id: "x", label: copy.shareX },
  { id: "telegram", label: copy.shareTelegram },
]

export function CreationShareDialog({
  open,
  onClose,
  lang,
  creationId,
  title,
  creatorLabel,
  coverUrl,
  allowArtworkDownload,
  isPixel,
}: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [exportFormat, setExportFormat] = useState<ShareExportFormat>("og")
  const [showBrand, setShowBrand] = useState(true)
  const [showCredit, setShowCredit] = useState(true)
  const [canNative, setCanNative] = useState(false)

  const canonical = useMemo(
    () => creationCanonicalUrl(lang, creationId),
    [lang, creationId],
  )

  const exportPath = useMemo(
    () =>
      creationSocialExportPath(creationId, exportFormat, {
        brand: showBrand,
        credit: showCredit,
      }),
    [creationId, exportFormat, showBrand, showCredit],
  )

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  useEffect(() => {
    if (!open) setStatus(null)
  }, [open])

  async function copyText(text: string, successLabel: string) {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(successLabel)
      return true
    } catch {
      setStatus(copy.shareCopyFailed[lang])
      return false
    }
  }

  async function nativeShare() {
    if (typeof navigator.share !== "function") {
      setStatus(copy.shareNativeUnavailable[lang])
      return
    }
    try {
      await navigator.share({ title, url: canonical, text: title })
      // Resolved without throw = host accepted the share action.
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ""
      if (name === "AbortError") return
      setStatus(copy.shareNativeUnavailable[lang])
    }
  }

  function openPlatform(platform: ShareIntentPlatform) {
    const url = platformShareUrl(platform, { url: canonical, title })
    window.open(url, "_blank", "noopener,noreferrer")
  }

  async function downloadUrl(path: string, filename: string) {
    try {
      const res = await fetch(path)
      if (!res.ok) throw new Error("download failed")
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = objectUrl
      a.download = filename
      a.rel = "noopener"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setStatus(copy.shareCopyFailed[lang])
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.share[lang]}
      closeLabel={copy.shareClose[lang]}
      className="w-[min(calc(100%-1rem),32rem)] max-h-[min(92vh,40rem)] overflow-y-auto sm:w-[min(calc(100%-2rem),36rem)]"
    >
      <div className="grid gap-5">
        <div className="flex gap-3 border-[3px] border-earth bg-soft p-3">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-16 w-16 shrink-0 object-contain bg-card"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-card text-[11px] font-medium text-muted">
              PXLB
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-fg">{title}</p>
            <p className="truncate text-[13px] text-muted">{creatorLabel}</p>
          </div>
        </div>

        <section className="grid gap-2">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {copy.sharePlatforms[lang]}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {canNative ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => void nativeShare()}>
                <PixelIcon name="share" />
                {copy.shareNative[lang]}
              </Button>
            ) : null}
            {PLATFORMS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => openPlatform(p.id)}
              >
                {p.label[lang]}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void copyText(canonical, `${copy.shareDiscord[lang]}: ${copy.shareCopied[lang]}`)
              }
            >
              {copy.shareDiscord[lang]}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void copyText(canonical, copy.shareCopied[lang])}
            >
              <PixelIcon name="copy" />
              {copy.shareCopyLink[lang]}
            </Button>
          </div>
          <p className="text-[12px] text-muted">{copy.shareDiscordHint[lang]}</p>
          <p className="text-[12px] text-muted">{copy.shareInstagramNote[lang]}</p>
        </section>

        <section className="grid gap-2">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
            {copy.shareQr[lang]}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creationQrPath(creationId, "png")}
              alt=""
              width={128}
              height={128}
              className="border-[3px] border-earth bg-card"
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadUrl(creationQrPath(creationId, "png"), `pxlb-${creationId}-qr.png`)
                }
              >
                <PixelIcon name="download" />
                {copy.shareQrDownloadPng[lang]}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void downloadUrl(creationQrPath(creationId, "svg"), `pxlb-${creationId}-qr.svg`)
                }
              >
                <PixelIcon name="download" />
                {copy.shareQrDownloadSvg[lang]}
              </Button>
            </div>
          </div>
        </section>

        {isPixel ? (
          <section className="grid gap-3">
            <p className="text-[12px] font-medium uppercase tracking-wide text-muted">
              {copy.shareExportStudio[lang]}
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["og", "shareExportOg"],
                  ["square", "shareExportSquare"],
                  ["story", "shareExportStory"],
                ] as const
              ).map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExportFormat(id)}
                  className={cn(
                    "min-h-10 border-[3px] px-3 text-[13px] font-medium",
                    exportFormat === id
                      ? "border-earth bg-brick text-white"
                      : "border-earth bg-card text-fg hover:bg-soft",
                  )}
                >
                  {copy[labelKey][lang]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showBrand}
                  onChange={(e) => setShowBrand(e.target.checked)}
                  className="size-4 accent-[var(--earth)]"
                />
                {copy.shareExportBrand[lang]}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showCredit}
                  onChange={(e) => setShowCredit(e.target.checked)}
                  className="size-4 accent-[var(--earth)]"
                />
                {copy.shareExportCredit[lang]}
              </label>
            </div>
            <div className="border-[3px] border-earth bg-soft p-2">
              <p className="mb-2 text-[12px] text-muted">{copy.shareExportPreview[lang]}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={exportPath}
                src={exportPath}
                alt=""
                className="mx-auto max-h-48 w-auto max-w-full object-contain bg-card"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  void downloadUrl(exportPath, `pxlb-${creationId}-${exportFormat}.png`)
                }
              >
                <PixelIcon name="download" />
                {copy.shareExportDownload[lang]}
              </Button>
              {allowArtworkDownload ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void downloadUrl(
                      `/api/pixel-download/${creationId}`,
                      `pxlb-${creationId}.png`,
                    )
                  }
                >
                  <PixelIcon name="download" />
                  {copy.shareDownloadArtwork[lang]}
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {status ? <p className="text-[13px] text-muted" role="status">{status}</p> : null}
      </div>
    </Dialog>
  )
}
