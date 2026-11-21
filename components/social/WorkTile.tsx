import Link from "next/link"
import { Comment } from "pixelarticons/react"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import type { CreationCard } from "@/features/creations/queries"
import { displayTitle } from "@/lib/creations"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * Visual-first work tile. The art is the tile.
 *  - default: creator chip (avatar + @username) always visible, title on hover/focus
 *  - large:   2×2 mosaic tile with a richer caption — title, creator name + @username,
 *             comment count (or a "no comments yet" cue)
 * The tile link and the creator link are siblings (never nested).
 */
export function WorkTile({
  creation,
  lang,
  className,
  showAuthor = true,
  size = "default",
}: {
  creation: CreationCard
  lang: Lang
  className?: string
  /** Hide the creator chip where the creator is already the page (profile). */
  showAuthor?: boolean
  size?: "default" | "large"
}) {
  const t = socialCopy.explore
  const title = displayTitle(creation.title, lang)
  const cover = creation.type === "pixel" ? creation.cover_url : null
  const large = size === "large"
  const authorName = creation.author.displayName?.trim() || creation.author.username
  const comments = creation.commentCount ?? 0
  const profileHref = href(lang, `/u/${creation.author.username}`)

  return (
    <article className={cn("group relative h-full min-w-0 overflow-hidden bg-soft", className)}>
      <Link
        href={href(lang, `/creation/${creation.id}`)}
        aria-label={
          showAuthor ? `${title} — ${socialCopy.landing.workBy[lang]} @${creation.author.username}` : title
        }
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none absolute inset-0">
        {cover ? (
          <PixelArt src={cover} alt="" variant="thumb" framed={false} />
        ) : (
          <div className="h-full w-full bg-soft" />
        )}
      </div>

      {!large ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-fg/75 px-2 py-1.5 text-[12px] font-medium text-white opacity-0 transition-opacity duration-[var(--soc-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="block truncate">{title}</span>
        </div>
      ) : null}

      {creation.isNew ? (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-[2] bg-coin px-1.5 py-0.5 text-[10px] font-semibold text-fg">
          {t.newBadge[lang]}
        </span>
      ) : null}

      {showAuthor && large ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-3 bg-fg/80 px-3 py-2.5 text-white">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight">{title}</p>
            <Link
              href={profileHref}
              className="pointer-events-auto mt-1.5 inline-flex max-w-full items-center gap-2"
            >
              <ProfileAvatar
                src={creation.author.avatarUrl}
                avatarConfig={creation.author.avatarConfig}
                userId={creation.author.id}
                alt=""
                size="xs"
                className="!h-7 !w-7 shrink-0"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[12px] font-semibold">{authorName}</span>
                <span className="truncate text-[11px] text-white/70">@{creation.author.username}</span>
              </span>
            </Link>
          </div>
          <span className="flex shrink-0 items-center gap-1 pb-0.5 text-[12px] text-white/90">
            <Comment width={16} height={16} aria-hidden="true" />
            {comments > 0 ? (
              <span aria-label={`${comments} ${t.commentsAria[lang]}`}>{comments}</span>
            ) : (
              <span className="hidden sm:inline">{t.noComments[lang]}</span>
            )}
          </span>
        </div>
      ) : null}

      {showAuthor && !large ? (
        <Link
          href={profileHref}
          className="absolute bottom-1.5 left-1.5 z-[2] flex max-w-[calc(100%-0.75rem)] items-center gap-1.5 bg-fg/75 py-1 pl-1 pr-2.5 text-white"
        >
          <ProfileAvatar
            src={creation.author.avatarUrl}
            avatarConfig={creation.author.avatarConfig}
            userId={creation.author.id}
            alt=""
            size="xs"
            className="!h-6 !w-6 shrink-0"
          />
          <span className="truncate text-[12px] font-semibold">@{creation.author.username}</span>
        </Link>
      ) : null}
    </article>
  )
}
