"use client"

import { useState } from "react"
import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { WorksDeleteButton } from "@/components/creations/WorksDeleteButton"
import { socialButtonClass } from "@/components/social/socialButton"
import { displayTitle } from "@/lib/creations"
import { copy } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard } from "@/features/creations/queries"

/** Owner gallery tile — same framed-art language as Explore/Profile cards. */
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
  const openHref =
    primary === "view" ? href(lang, `/creation/${item.id}`) : href(lang, `/create/${item.id}`)

  return (
    <li>
      <article className="pixel-frame flex h-full min-w-0 flex-col bg-card">
        <Link href={openHref} className="relative block" aria-label={title}>
          {cover ? (
            <PixelArt src={cover} alt="" variant="thumb" framed={false} />
          ) : (
            <div className="pixel-thumb bg-soft" />
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 px-2.5 pb-2.5 pt-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-snug text-fg sm:text-[14px]">
              {title}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-snug text-muted">
              {statusLabel}
              {` · ${formatDayMonthYear(item.updated_at, lang)}`}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            {primary === "view" ? (
              <>
                <Link
                  href={href(lang, `/creation/${item.id}`)}
                  className={socialButtonClass({ variant: "soft", size: "sm" })}
                >
                  {copy.worksView[lang]}
                </Link>
                <Link
                  href={href(lang, `/create/${item.id}`)}
                  className={socialButtonClass({ variant: "soft", size: "sm" })}
                >
                  {copy.createEdit[lang]}
                </Link>
              </>
            ) : (
              <Link
                href={href(lang, `/create/${item.id}`)}
                className={socialButtonClass({ variant: "solid", size: "sm" })}
              >
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
      </article>
    </li>
  )
}
