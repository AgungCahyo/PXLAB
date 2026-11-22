"use client"

import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ImageDown,
  Loader2,
  QrCode,
  Share2,
} from "lucide-react"
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react"
import { Dialog } from "@/components/ui/Dialog"
import {
  DiscordIcon,
  FacebookIcon,
  InstagramIcon,
  TelegramIcon,
  ThreadsIcon,
  WhatsAppIcon,
  XIcon,
} from "@/components/share/ShareBrandIcons"
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

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>

const PRIMARY: {
  id: ShareIntentPlatform | "instagram"
  label: { id: string; en: string }
  Icon: BrandIcon
  color: string
}[] = [
  { id: "whatsapp", label: copy.shareWhatsApp, Icon: WhatsAppIcon, color: "#25D366" },
  { id: "instagram", label: copy.shareInstagram, Icon: InstagramIcon, color: "#E1306C" },
  { id: "facebook", label: copy.shareFacebook, Icon: FacebookIcon, color: "#1877F2" },
  { id: "x", label: copy.shareX, Icon: XIcon, color: "#111111" },
  { id: "threads", label: copy.shareThreads, Icon: ThreadsIcon, color: "#111111" },
]

const MORE_PLATFORMS: {
  id: "telegram" | "discord"
  label: { id: string; en: string }
  Icon: BrandIcon
  color: string
}[] = [
  { id: "telegram", label: copy.shareTelegram, Icon: TelegramIcon, color: "#229ED9" },
  { id: "discord", label: copy.shareDiscord, Icon: DiscordIcon, color: "#5865F2" },
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
  const [status, setStatus] = useState<"idle" | "copied" | "error" | "loading">("idle")
  const [canNative, setCanNative] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [igOpen, setIgOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ShareExportFormat>("og")
  const [qrFormat, setQrFormat] = useState<"png" | "svg">("png")

  const canonical = useMemo(
    () => creationCanonicalUrl(lang, creationId),
    [lang, creationId],
  )

  const exportPath = useMemo(
    () => creationSocialExportPath(creationId, exportFormat),
    [creationId, exportFormat],
  )

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function")
  }, [])

  useEffect(() => {
    if (!open) {
      setStatus("idle")
      setMoreOpen(false)
      setIgOpen(false)
      setExportOpen(false)
    }
  }, [open])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(canonical)
      setStatus("copied")
      window.setTimeout(() => setStatus("idle"), 2000)
    } catch {
      setStatus("error")
    }
  }

  async function nativeShare() {
    if (typeof navigator.share !== "function") return
    try {
      await navigator.share({ title, url: canonical, text: title })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ""
      if (name === "AbortError") return
      setStatus("error")
    }
  }

  function openPlatform(platform: ShareIntentPlatform) {
    window.open(
      platformShareUrl(platform, { url: canonical, title }),
      "_blank",
      "noopener,noreferrer",
    )
  }

  async function downloadUrl(path: string, filename: string) {
    setStatus("loading")
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
      setStatus("idle")
    } catch {
      setStatus("error")
    }
  }

  function onPrimary(id: (typeof PRIMARY)[number]["id"]) {
    if (id === "instagram") {
      setIgOpen((v) => !v)
      setMoreOpen(false)
      return
    }
    setIgOpen(false)
    openPlatform(id)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={copy.share[lang]}
      closeLabel={copy.shareClose[lang]}
      tone="social"
      className="w-[min(calc(100%-1rem),22rem)]"
    >
      <div className="grid gap-4">
        <div className="flex items-center gap-3">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              className="h-12 w-12 shrink-0 border border-[color:var(--soc-hairline)] bg-card object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[color:var(--soc-hairline)] bg-soft text-[10px] font-medium text-muted">
              PXLB
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-fg">{title}</p>
            <p className="truncate text-[12px] text-muted">{creatorLabel}</p>
          </div>
        </div>

        {canNative ? (
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-fg px-4 text-[14px] font-semibold text-bg hover:opacity-90"
          >
            <Share2 className="size-4 shrink-0" strokeWidth={2.25} />
            {copy.shareNative[lang]}
          </button>
        ) : null}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRIMARY.map(({ id, label, Icon, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => onPrimary(id)}
              aria-pressed={id === "instagram" ? igOpen : undefined}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 bg-soft px-1 py-2 text-fg transition-colors",
                "hover:bg-[color:var(--soc-hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky",
                id === "instagram" && igOpen && "bg-[color:var(--soc-hairline)]",
              )}
            >
              <span
                className="flex size-9 items-center justify-center rounded-sm"
                style={{ color }}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-[11px] font-medium leading-tight">{label[lang]}</span>
            </button>
          ))}
        </div>

        {igOpen && isPixel ? (
          <div className="grid gap-2 border border-[color:var(--soc-hairline)] bg-soft p-3">
            <p className="text-[12px] text-muted">{copy.shareInstagramHint[lang]}</p>
            <div className="grid grid-cols-2 gap-2">
              <SecondaryAction
                icon={<ImageDown className="size-4" strokeWidth={2.25} />}
                label={copy.shareIgStory[lang]}
                onClick={() =>
                  void downloadUrl(
                    creationSocialExportPath(creationId, "story"),
                    `pxlb-${creationId}-story.png`,
                  )
                }
              />
              <SecondaryAction
                icon={<ImageDown className="size-4" strokeWidth={2.25} />}
                label={copy.shareIgSquare[lang]}
                onClick={() =>
                  void downloadUrl(
                    creationSocialExportPath(creationId, "square"),
                    `pxlb-${creationId}-square.png`,
                  )
                }
              />
            </div>
          </div>
        ) : null}

        {igOpen && !isPixel ? (
          <p className="text-[12px] text-muted">{copy.shareInstagramUnavailable[lang]}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-soft px-4 text-[14px] font-semibold text-fg hover:bg-[color:var(--soc-hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
        >
          {status === "copied" ? (
            <Check className="size-4 shrink-0 text-grass" strokeWidth={2.25} />
          ) : (
            <Copy className="size-4 shrink-0" strokeWidth={2.25} />
          )}
          {status === "copied" ? copy.shareCopied[lang] : copy.shareCopyLink[lang]}
        </button>

        <div className="border-t border-[color:var(--soc-hairline)] pt-1">
          <button
            type="button"
            onClick={() => {
              setMoreOpen((v) => !v)
              if (moreOpen) setExportOpen(false)
            }}
            aria-expanded={moreOpen}
            className="inline-flex min-h-10 w-full items-center justify-between gap-2 px-1 text-[13px] font-medium text-muted hover:text-fg"
          >
            {copy.shareMoreOptions[lang]}
            <ChevronDown
              className={cn("size-4 transition-transform", moreOpen && "rotate-180")}
              strokeWidth={2.25}
            />
          </button>

          {moreOpen ? (
            <div className="mt-2 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                {MORE_PLATFORMS.map(({ id, label, Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (id === "discord") {
                        void copyLink()
                        return
                      }
                      openPlatform(id)
                    }}
                    className="inline-flex min-h-11 items-center gap-2 bg-soft px-3 text-[13px] font-medium hover:bg-[color:var(--soc-hairline)]"
                  >
                    <span style={{ color }}>
                      <Icon className="size-4" />
                    </span>
                    {label[lang]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <SecondaryAction
                  className="flex-1"
                  icon={<QrCode className="size-4" strokeWidth={2.25} />}
                  label={copy.shareQrDownload[lang]}
                  onClick={() =>
                    void downloadUrl(
                      creationQrPath(creationId, qrFormat),
                      `pxlb-${creationId}-qr.${qrFormat}`,
                    )
                  }
                />
                <select
                  value={qrFormat}
                  onChange={(e) => setQrFormat(e.target.value === "svg" ? "svg" : "png")}
                  aria-label={copy.shareQrFormat[lang]}
                  className="min-h-11 border border-[color:var(--soc-hairline)] bg-soft px-2 text-[12px] font-medium text-fg"
                >
                  <option value="png">PNG</option>
                  <option value="svg">SVG</option>
                </select>
              </div>

              {isPixel ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExportOpen((v) => !v)}
                    aria-expanded={exportOpen}
                    className="inline-flex min-h-11 items-center justify-between gap-2 bg-soft px-3 text-[13px] font-medium hover:bg-[color:var(--soc-hairline)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ImageDown className="size-4" strokeWidth={2.25} />
                      {copy.shareExportSocial[lang]}
                    </span>
                    <ChevronDown
                      className={cn("size-4 transition-transform", exportOpen && "rotate-180")}
                      strokeWidth={2.25}
                    />
                  </button>

                  {exportOpen ? (
                    <div className="grid gap-2 border border-[color:var(--soc-hairline)] bg-soft p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ["og", copy.shareExportOgShort],
                            ["square", copy.shareExportSquareShort],
                            ["story", copy.shareExportStoryShort],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setExportFormat(id)}
                            className={cn(
                              "min-h-9 px-2.5 text-[12px] font-semibold",
                              exportFormat === id ? "bg-fg text-bg" : "bg-card text-muted hover:text-fg",
                            )}
                          >
                            {label[lang]}
                          </button>
                        ))}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        key={exportPath}
                        src={exportPath}
                        alt=""
                        className="mx-auto max-h-28 w-auto max-w-full bg-card object-contain"
                      />
                      <SecondaryAction
                        icon={
                          status === "loading" ? (
                            <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
                          ) : (
                            <Download className="size-4" strokeWidth={2.25} />
                          )
                        }
                        label={copy.shareExportDownload[lang]}
                        onClick={() =>
                          void downloadUrl(exportPath, `pxlb-${creationId}-${exportFormat}.png`)
                        }
                      />
                    </div>
                  ) : null}

                  {allowArtworkDownload ? (
                    <SecondaryAction
                      icon={<Download className="size-4" strokeWidth={2.25} />}
                      label={copy.shareDownloadArtwork[lang]}
                      onClick={() =>
                        void downloadUrl(
                          `/api/pixel-download/${creationId}`,
                          `pxlb-${creationId}.png`,
                        )
                      }
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {status === "error" ? (
          <p className="text-[12px] text-brick" role="status">
            {copy.shareCopyFailed[lang]}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}

function SecondaryAction({
  icon,
  label,
  onClick,
  className,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 bg-soft px-3 text-[13px] font-medium hover:bg-[color:var(--soc-hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky",
        className,
      )}
    >
      {icon}
      {label}
    </button>
  )
}
