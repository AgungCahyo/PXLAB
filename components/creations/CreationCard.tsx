import Link from "next/link"
import { ViewTransition } from "react"
import { PixelArt } from "@/components/creations/PixelArt"
import {
  captionForCard,
  displayTitle,
  formatCreationTag,
  tagsForCard,
} from "@/lib/creations"
import { href, type Lang } from "@/lib/i18n"
import { pixelCoverUrl } from "@/lib/site"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreationCard({
  creation,
  lang,
  hrefPath,
}: {
  creation: CreationCardData
  lang: Lang
  hrefPath?: string
}) {
  const path = hrefPath ?? `/creation/${creation.id}`
  const cover =
    creation.type === "pixel" ? creation.cover_url || pixelCoverUrl(creation.id) : null
  const cardCaption = captionForCard(creation.caption)
  const { visible: cardTags, more: moreTags } = tagsForCard(creation.tags)

  return (
    <article className="pixel-frame h-full bg-card">
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
        <div className="px-3 pt-2.5 pb-3">
          <p className="truncate text-[14px] font-medium leading-snug text-fg">
            {displayTitle(creation.title, lang)}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-muted">@{creation.author.username}</p>
          {cardCaption ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted">{cardCaption}</p>
          ) : null}
          {cardTags.length > 0 ? (
            <p className="mt-1 truncate text-[12px] leading-snug text-muted">
              {cardTags.map(formatCreationTag).join(" ")}
              {moreTags > 0 ? ` +${moreTags}` : ""}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
