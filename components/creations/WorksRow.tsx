"use client"

import { useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Archive } from "pixelarticons/react"
import { PixelArt } from "@/components/creations/PixelArt"
import { WorksDeleteButton } from "@/components/creations/WorksDeleteButton"
import { useToast } from "@/components/social/Toast"
import { focusMenuItem, handleMenuKeyDown } from "@/components/ui/menuKeyboard"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { socialButtonClass } from "@/components/social/socialButton"
import { setArchiveStateAction } from "@/features/feeds/actions"
import { displayTitle } from "@/lib/creations"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { formatDayMonthYear } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { CreationCard } from "@/features/creations/queries"
import { Calendar } from "lucide-react"

/** Ellipsis dropdown for secondary actions (Archive, Delete). */
function WorksCardMenu({
  lang,
  creationId,
  title,
  published,
  onArchived,
  onDeleted,
}: {
  lang: Lang
  creationId: string
  title: string
  published: boolean
  onArchived: () => void
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const triggerId = useId()
  const menuId = useId()
  const pendingFocusRef = useRef<"first" | "last">("first")

  const handleArchive = async () => {
    if (archiving) return
    setArchiving(true)
    try {
      const formData = new FormData()
      formData.set("creation_id", creationId)
      formData.set("desired", "true")
      const result = await setArchiveStateAction(null, formData)
      if (!result || !("ok" in result)) {
        const msg =
          result && "error" in result && result.error === "migration_required"
            ? socialCopy.feeds.migrationError[lang]
            : socialCopy.feeds.actionError[lang]
        toast(msg, "error")
        return
      }
      setOpen(false)
      onArchived()
      router.refresh()
    } catch {
      toast(socialCopy.feeds.actionError[lang], "error")
    } finally {
      setArchiving(false)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
  }

  const closeAndFocus = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Move focus into the menu when it opens (first item, or last for ArrowUp).
  useEffect(() => {
    if (!open) return
    focusMenuItem(ref.current, pendingFocusRef.current)
    pendingFocusRef.current = "first"
  }, [open])

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        id={triggerId}
        ref={triggerRef}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={copy.moreActions[lang]}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            pendingFocusRef.current = event.key === "ArrowUp" ? "last" : "first"
            setOpen(true)
          }
        }}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-line bg-soft text-muted transition-colors hover:border-fg/30 hover:text-fg",
          open && "border-fg bg-card text-fg",
        )}
      >
        <PixelIcon name="more" className="h-4 w-4" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={(event) => handleMenuKeyDown(event, { onClose: closeAndFocus })}
          className="absolute right-0 bottom-full z-50 mb-1 min-w-36 rounded-[2px] border border-line bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            disabled={archiving}
            onClick={() => void handleArchive()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-fg transition-colors hover:bg-soft disabled:opacity-50"
          >
            <Archive width={15} height={15} className="shrink-0 text-muted" aria-hidden="true" />
            <span>{socialCopy.feeds.archiveAction[lang]}</span>
          </button>
          <WorksDeleteButton
            lang={lang}
            creationId={creationId}
            title={title}
            published={published}
            onDeleted={() => {
              setOpen(false)
              onDeleted()
            }}
            variant="menuitem"
          />
        </div>
      ) : null}
    </div>
  )
}

/** Owner gallery card matching Reference Screenshot */
export function WorksRow({
  lang,
  item,
  primary,
}: {
  lang: Lang
  item: CreationCard
  primary: "continue" | "view"
}) {
  const [removed, setRemoved] = useState(false)
  if (removed) return null

  const cover = item.type === "pixel" ? item.cover_url : null
  const title = displayTitle(item.title, lang)
  const openHref =
    primary === "view" ? href(lang, `/creation/${item.id}`) : href(lang, `/create/${item.id}`)

  const isPublished = item.status === "published"
  const statusLabel = isPublished
    ? copy.createPublishedBadge[lang]
    : item.status === "hidden"
      ? copy.createHiddenBadge[lang]
      : copy.createDraftBadge[lang]

  return (
    <li className="min-w-0">
      <article className="group flex h-full min-w-0 flex-col rounded-none border border-line bg-card transition-colors hover:border-fg/40">
        {/* Thumbnail */}
        <Link
          href={openHref}
          className="relative block aspect-square w-full overflow-hidden border-b border-line bg-soft"
          aria-label={title}
          tabIndex={-1}
        >
          {cover ? (
            <PixelArt src={cover} alt="" variant="thumb" framed={false} />
          ) : (
            <div className="pixel-thumb bg-soft" />
          )}
          <div className="absolute inset-0 bg-fg/0 transition-colors group-hover:bg-fg/5" />
        </Link>

        {/* Card Details */}
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <Link href={openHref} className="block min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug text-fg transition-colors hover:text-[#ff4f00] sm:text-[15px]">
              {title}
            </p>
          </Link>

          {/* Date & Status Metadata */}
          <div className="mt-1 flex items-center gap-1.5 text-[12px] tabular-nums text-muted">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 truncate">
              {statusLabel} · {formatDayMonthYear(item.updated_at, lang)}
            </span>
          </div>

          {/* Action Button Row */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-1">
            {primary === "view" ? (
              <>
                <Link
                  href={href(lang, `/creation/${item.id}`)}
                  className="inline-flex h-8 min-w-0 flex-1 basis-24 items-center justify-center gap-1.5 rounded-[2px] border border-line bg-soft px-2.5 text-[12px] font-medium text-fg transition-colors hover:border-fg/30 hover:bg-card sm:flex-none sm:px-3"
                >
                  <PixelIcon name="eye" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">{copy.worksView[lang]}</span>
                </Link>
                <Link
                  href={href(lang, `/create/${item.id}`)}
                  className="inline-flex h-8 min-w-0 flex-1 basis-24 items-center justify-center gap-1.5 rounded-[2px] border border-line bg-soft px-2.5 text-[12px] font-medium text-fg transition-colors hover:border-fg/30 hover:bg-card sm:flex-none sm:px-3"
                >
                  <PixelIcon name="pencil" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="truncate">{copy.createEdit[lang]}</span>
                </Link>
              </>
            ) : (
              <Link
                href={href(lang, `/create/${item.id}`)}
                className="inline-flex h-8 min-w-0 flex-1 basis-24 items-center justify-center gap-1.5 rounded-[2px] bg-[#ff4f00] px-3 text-[12px] font-medium text-white transition-colors hover:bg-[#e04400] sm:flex-none sm:px-3.5"
              >
                <PixelIcon name="pencil" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{copy.worksContinue[lang]}</span>
              </Link>
            )}

            <div className="ml-auto shrink-0">
              <WorksCardMenu
                lang={lang}
                creationId={item.id}
                title={title}
                published={isPublished}
                onArchived={() => setRemoved(true)}
                onDeleted={() => setRemoved(true)}
              />
            </div>
          </div>
        </div>

        {/* Hidden reference to satisfy theme styling compatibility */}
        <span className="sr-only">{socialButtonClass({ variant: "soft" })}</span>
      </article>
    </li>
  )
}
