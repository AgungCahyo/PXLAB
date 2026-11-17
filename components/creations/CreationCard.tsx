import Link from "next/link"
import { ViewTransition } from "react"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreationCard({
  creation,
  lang,
  hrefPath,
  showAuthor = true,
  /** Shared morph to detail. Off when the same id may also appear in another list. */
  artTransition = true,
}: {
  creation: CreationCardData
  lang: Lang
  hrefPath?: string
  /** Hide @username on profile grids where the author is already known. */
  showAuthor?: boolean
  artTransition?: boolean
}) {
  const path = hrefPath ?? `/creation/${creation.id}`
  const cover = creation.type === "pixel" ? creation.cover_url : null
  const sizeLabel = creation.category
    ? creationCategoryLabels[creation.category][lang]
    : null
  const title = displayTitle(creation.title, lang)
  const profileHref = href(lang, `/u/${creation.author.username}`)
  const notes =
    creation.commentCount && creation.commentCount > 0
      ? copy.cardNotesCount[lang].replace("{count}", String(creation.commentCount))
      : null
  const thumb = cover ? (
    <PixelArt src={cover} alt="" variant="thumb" framed={false} />
  ) : (
    <div className="pixel-thumb bg-soft" />
  )

  return (
    <article className="pixel-frame relative h-full min-w-0 bg-card">
      <Link
        href={href(lang, path)}
        transitionTypes={["nav-forward"]}
        className="absolute inset-0 z-0"
        aria-label={title}
      />
      <div className="pointer-events-none relative z-[1]">
        {cover && artTransition ? (
          <ViewTransition name={`creation-art-${creation.id}`} share="morph" default="none">
            {thumb}
          </ViewTransition>
        ) : (
          thumb
        )}
        {creation.isNew ? (
          <span className="absolute left-2 top-2 border-[2px] border-earth bg-card px-1.5 py-0.5 text-[10px] font-medium text-fg">
            {copy.feedNewBadge[lang]}
          </span>
        ) : null}
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="truncate text-[13px] font-medium leading-snug text-fg sm:text-[14px]">
            {title}
          </p>
          {showAuthor ? (
            <div className="pointer-events-auto relative z-[2] mt-1 flex min-w-0 items-center gap-1.5">
              <Link href={profileHref} className="flex min-w-0 items-center gap-1.5 hover:text-fg">
                <ProfileAvatar src={creation.author.avatarUrl} alt={creation.author.username} size="xs" />
                <span className="truncate text-[12px] text-muted">@{creation.author.username}</span>
              </Link>
            </div>
          ) : null}
          {sizeLabel || notes ? (
            <p className="mt-0.5 truncate text-[11px] leading-snug text-muted">
              {[sizeLabel, notes].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}
