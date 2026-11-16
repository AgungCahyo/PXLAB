"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { PixelIcon } from "@/components/ui/PixelIcon"
import {
  updateAllowPngDownloadAction,
  type CreationActionState,
} from "@/features/creations/actions"
import { canDownloadCreationPng } from "@/lib/auth/permissions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function CreationMoreMenu({
  lang,
  creationId,
  ownerId,
  viewerId,
  status,
  allowPngDownload: initialAllow,
  variant = "detail",
}: {
  lang: Lang
  creationId: string
  ownerId: string
  viewerId: string | null
  status: "draft" | "published" | "hidden"
  allowPngDownload: boolean
  /** detail = ⋯ control on the public page; embedded = panel body for Playground More */
  variant?: "detail" | "embedded"
}) {
  const isOwner = Boolean(viewerId && viewerId === ownerId)
  const [open, setOpen] = useState(false)
  const [allow, setAllow] = useState(initialAllow)
  const [permState, permAction, permPending] = useActionState(
    updateAllowPngDownloadAction,
    null as CreationActionState,
  )
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!permPending) setAllow(initialAllow)
  }, [initialAllow, permPending])

  useEffect(() => {
    if (permState && "error" in permState) setAllow(initialAllow)
  }, [permState, initialAllow])

  const canDownload = canDownloadCreationPng({
    viewerId,
    ownerId,
    status,
    allowPngDownload: allow,
  })

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

  const body = (
    <div className="grid gap-3">
      {canDownload ? (
        <a
          href={`/api/pixel-download/${creationId}`}
          className={buttonClassName({ variant: "outline" })}
        >
          <PixelIcon name="download" />
          {copy.downloadArtwork[lang]}
        </a>
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
