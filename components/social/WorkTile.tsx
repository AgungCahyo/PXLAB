import { memo } from "react"
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
 * Visual-first work tile matching PXLB's modern design direction.
 *  - default: creator chip (avatar + @username) always visible, title on hover/focus
 *  - large:   2×2 mosaic tile with a richer caption — title, creator name + @username,
 *             comment count (or a "no comments yet" cue)
 * The tile link and the creator link are siblings (never nested).
 */
export const WorkTile = memo(function WorkTile({
  creation,
  lang,
  className,
  showAuthor = true,
  size = "default",
  preserveScroll = false,
}: {
  creation: CreationCard
  lang: Lang
  className?: string
  /** Hide the creator chip where the creator is already the page (profile). */
  showAuthor?: boolean
  size?: "default" | "large"
  /** Opt in for feeds that restore their own scroll position (Explore only). */
  preserveScroll?: boolean
}) {
  const t = socialCopy.explore
  const title = displayTitle(creation.title, lang)
  const cover = creation.type === "pixel" ? creation.cover_url : null
  const large = size === "large"
  const authorName = creation.author.displayName?.trim() || creation.author.username
  const comments = creation.commentCount ?? 0
  const profileHref = href(lang, `/u/${creation.author.username}`)
  const restoreScrollProps = preserveScroll
    ? ({ scroll: false, "data-explore-resume": "true" } as const)
    : {}

  return (
    <article
      className={cn(
        "group relative min-w-0 overflow-hidden rounded-none border border-line bg-card transition-colors duration-150 hover:border-fg/40",
        large ? "h-full" : "aspect-square",
        className,
      )}
    >
      <Link
        {...restoreScrollProps}
        href={href(lang, `/creation/${creation.id}`)}
        aria-label={
          showAuthor ? `${title} — ${socialCopy.landing.workBy[lang]} @${creation.author.username}` : title
        }
        className="absolute inset-0 z-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
      />
      <div className="pointer-events-none absolute inset-0">
        {cover ? (
          <PixelArt src={cover} alt="" variant="thumb" framed={false} />
        ) : (
          <div className="h-full w-full bg-soft" />
        )}
      </div>

      {!large ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-gradient-to-b from-black/65 to-transparent px-3 py-2.5 text-[12px] font-medium text-white opacity-100 transition-opacity duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <span className="block truncate">{title}</span>
        </div>
      ) : null}

      {creation.isNew ? (
        <span className="pointer-events-none absolute right-2 top-2 z-[2] rounded-[2px] bg-[#ff4f00] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
          {t.newBadge[lang]}
        </span>
      ) : null}

      {showAuthor && large ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-end justify-between gap-3 border-t border-white/15 bg-[#111113]/85 px-4 py-3 text-white backdrop-blur-xs">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">{title}</p>
            <Link
              {...restoreScrollProps}
              href={profileHref}
              className="pointer-events-auto mt-2 inline-flex max-w-full items-center gap-2 transition-opacity hover:opacity-85"
            >
              <ProfileAvatar
                src={creation.author.avatarUrl}
                avatarConfig={creation.author.avatarConfig}
                userId={creation.author.id}
                alt=""
                size="xs"
                className="!h-7 !w-7 shrink-0 border border-white/20"
              />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[12px] font-semibold">{authorName}</span>
                <span className="truncate text-[11px] text-slate-300">@{creation.author.username}</span>
              </span>
            </Link>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 pb-0.5 text-[12px] text-white/90">
            <Comment width={16} height={16} aria-hidden="true" />
            {comments > 0 ? (
              <span aria-label={`${comments} ${t.commentsAria[lang]}`}>{comments}</span>
            ) : (
              <span className="hidden sm:inline text-slate-300">{t.noComments[lang]}</span>
            )}
          </span>
        </div>
      ) : null}

      {showAuthor && !large ? (
        <Link
          {...restoreScrollProps}
          href={profileHref}
          className="absolute bottom-2 left-2 z-[2] flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-[2px] border border-white/20 bg-[#111113]/80 py-1 pl-1 pr-2.5 text-white backdrop-blur-xs transition-colors hover:bg-[#111113]"
        >
          <ProfileAvatar
            src={creation.author.avatarUrl}
            avatarConfig={creation.author.avatarConfig}
            userId={creation.author.id}
            alt=""
            size="xs"
            className="!h-6 !w-6 shrink-0 border border-white/20"
          />
          <span className="truncate text-[12px] font-semibold">@{creation.author.username}</span>
        </Link>
      ) : null}
    </article>
  )
})
