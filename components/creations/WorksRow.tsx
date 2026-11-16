"use client"

import { useState } from "react"
import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { WorksDeleteButton } from "@/components/creations/WorksDeleteButton"
import { buttonClassName } from "@/components/ui/Button"
import { captionForCard, displayTitle } from "@/lib/creations"
import { copy, creationTypeLabels } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard } from "@/features/creations/queries"

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
  const statusLabel =
    item.status === "published"
      ? copy.createPublishedBadge[lang]
      : item.status === "hidden"
        ? copy.createHiddenBadge[lang]
        : copy.createDraftBadge[lang]
  const title = displayTitle(item.title, lang)
  const cardCaption = captionForCard(item.caption)

  return (
    <li>
      <div className="pixel-frame flex min-h-16 items-center gap-4 bg-card">
        {cover ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden border-r-[3px] border-earth bg-bg">
            <PixelArt src={cover} alt="" variant="thumb" framed={false} />
          </div>
        ) : (
          <div className="h-20 w-20 shrink-0 border-r-[3px] border-earth bg-soft" aria-hidden />
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-4 sm:px-4">
          <p className="truncate font-medium">{title}</p>
          {cardCaption ? (
            <p className="mt-0.5 truncate text-[13px] text-muted">{cardCaption}</p>
          ) : null}
          <p className="mt-1 text-[13px] text-muted">
            {creationTypeLabels[item.type][lang]} · {statusLabel}
            {` · ${formatDayMonthYear(item.updated_at, lang)}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:px-5">
          {primary === "view" ? (
            <>
              <Link
                href={href(lang, `/creation/${item.id}`)}
                className={buttonClassName({ size: "sm", variant: "secondary" })}
              >
                {copy.worksView[lang]}
              </Link>
              <Link
                href={href(lang, `/create/${item.id}`)}
                className={buttonClassName({ size: "sm", variant: "outline" })}
              >
                {copy.createEdit[lang]}
              </Link>
            </>
          ) : (
            <Link href={href(lang, `/create/${item.id}`)} className={buttonClassName({ size: "sm" })}>
              {copy.worksContinue[lang]}
            </Link>
          )}
          <WorksDeleteButton
            lang={lang}
            creationId={item.id}
            title={title}
            published={item.status === "published"}
            onDeleted={() => setRemoved(true)}
          />
        </div>
      </div>
    </li>
  )
}
