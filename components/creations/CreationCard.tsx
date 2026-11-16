import Link from "next/link"
import { ViewTransition } from "react"
import { PixelArt } from "@/components/creations/PixelArt"
import { displayTitle } from "@/lib/creations"
import { creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreationCard({
  creation,
  lang,
  hrefPath,
  showAuthor = true,
}: {
  creation: CreationCardData
  lang: Lang
  hrefPath?: string
  /** Hide @username on profile grids where the author is already known. */
  showAuthor?: boolean
}) {
  const path = hrefPath ?? `/creation/${creation.id}`
  const cover = creation.type === "pixel" ? creation.cover_url : null
  const sizeLabel = creation.category
    ? creationCategoryLabels[creation.category][lang]
    : null

  return (
    <article className="pixel-frame h-full min-w-0 bg-card">
      <Link
        href={href(lang, path)}
        transitionTypes={["nav-forward"]}
        className="block h-full hover:bg-soft"
      >
        {cover ? (
          <ViewTransition name={`creation-art-${creation.id}`} share="morph" default="none">
            <PixelArt src={cover} alt="" variant="thumb" framed={false} />
          </ViewTransition>
        ) : (
          <div className="pixel-thumb bg-soft" />
        )}
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="truncate text-[13px] font-medium leading-snug text-fg sm:text-[14px]">
            {displayTitle(creation.title, lang)}
          </p>
          {showAuthor ? (
            <p className="mt-0.5 truncate text-[12px] text-muted">@{creation.author.username}</p>
          ) : null}
          {sizeLabel ? (
            <p className="mt-0.5 truncate text-[11px] leading-snug text-muted">{sizeLabel}</p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
