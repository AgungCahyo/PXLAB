"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { WorksDeleteButton } from "@/components/creations/WorksDeleteButton"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { socialButtonClass } from "@/components/social/socialButton"
import { displayTitle } from "@/lib/creations"
import { copy } from "../../lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { CreationCard } from "@/features/creations/queries"

/** Ellipsis dropdown for secondary actions (Delete). */
function WorksCardMenu({
  lang,
  creationId,
  title,
  published,
  onDeleted,
}: {
  lang: Lang
  creationId: string
  title: string
  published: boolean
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
  }

  return (
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        type="button"
        aria-label="Tindakan lainnya"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 text-muted transition-colors hover:bg-slate-100 hover:text-fg",
          open && "bg-slate-100 text-fg ring-2 ring-purple-400/30",
        )}
      >
        <PixelIcon name="more" className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 bottom-full z-50 mb-1 min-w-36 rounded-xl border border-slate-200/90 bg-card p-1 shadow-lg ring-1 ring-black/5">
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
    <li>
      <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-card p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
        {/* Thumbnail with rounded corners and subtle overlay */}
        <Link
          href={openHref}
          className="relative block aspect-square w-full overflow-hidden rounded-xl bg-slate-50"
          aria-label={title}
          tabIndex={-1}
        >
          {cover ? (
            <PixelArt src={cover} alt="" variant="thumb" framed={false} />
          ) : (
            <div className="pixel-thumb bg-slate-100" />
          )}
          <div className="absolute inset-0 bg-fg/0 transition-colors group-hover:bg-fg/5" />
        </Link>

        {/* Card Details */}
        <div className="mt-3 flex min-w-0 flex-1 flex-col">
          <Link href={openHref} className="block min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug text-fg transition-colors hover:text-[#6355d8] sm:text-[15px]">
              {title}
            </p>
          </Link>

          {/* Date & Status Metadata */}
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <span role="img" aria-hidden="true" className="text-xs">
              📅
            </span>
            <span>
              {statusLabel} · {formatDayMonthYear(item.updated_at, lang)}
            </span>
          </div>

          {/* Action Button Row matching Screenshot */}
          <div className="mt-4 flex items-center gap-1.5 pt-1">
            {primary === "view" ? (
              <>
                <Link
                  href={href(lang, `/creation/${item.id}`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
                >
                  <PixelIcon name="eye" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  {copy.worksView[lang]}
                </Link>
                <Link
                  href={href(lang, `/create/${item.id}`)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
                >
                  <PixelIcon name="pencil" className="h-3.5 w-3.5 shrink-0 text-muted" />
                  {copy.createEdit[lang]}
                </Link>
              </>
            ) : (
              <Link
                href={href(lang, `/create/${item.id}`)}
                className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#6355d8] px-3.5 text-[12px] font-medium text-white shadow-sm transition-colors hover:bg-[#5245c7]"
              >
                <PixelIcon name="pencil" className="h-3.5 w-3.5 shrink-0" />
                {copy.worksContinue[lang]}
              </Link>
            )}

            <div className="ml-auto">
              <WorksCardMenu
                lang={lang}
                creationId={item.id}
                title={title}
                published={isPublished}
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
