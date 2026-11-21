import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import type { CreationCard } from "@/features/creations/queries"
import { displayTitle } from "@/lib/creations"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * Visual-first work tile (Instagram-explore style): the art is the tile; the creator
 * is always visible as a chip (never hover-only), title appears on hover for desktop.
 * Two links, not nested: one covers the tile, the chip sits above it.
 */
export function WorkTile({
  creation,
  lang,
  className,
  showAuthor = true,
}: {
  creation: CreationCard
  lang: Lang
  className?: string
  /** Hide the creator chip where the creator is already the page (profile). */
  showAuthor?: boolean
}) {
  const title = displayTitle(creation.title, lang)
  const cover = creation.type === "pixel" ? creation.cover_url : null

  return (
    <article className={cn("group relative aspect-square min-w-0 overflow-hidden bg-soft", className)}>
      <Link
        href={href(lang, `/creation/${creation.id}`)}
        aria-label={showAuthor ? `${title} — ${socialCopy.landing.workBy[lang]} @${creation.author.username}` : title}
        className="absolute inset-0 z-0"
      />
      <div className="pointer-events-none absolute inset-0">
        {cover ? (
          <PixelArt src={cover} alt="" variant="thumb" framed={false} />
        ) : (
          <div className="h-full w-full bg-soft" />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] bg-fg/70 px-2 py-1.5 text-[12px] font-medium text-white opacity-0 transition-opacity duration-[var(--soc-fast)] group-hover:opacity-100 group-focus-within:opacity-100">
        <span className="block truncate">{title}</span>
      </div>
      {creation.isNew ? (
        <span className="pointer-events-none absolute right-1.5 top-1.5 z-[2] bg-coin px-1.5 py-0.5 text-[10px] font-semibold text-fg">
          {socialCopy.explore.newBadge[lang]}
        </span>
      ) : null}
      {showAuthor ? (
      <Link
        href={href(lang, `/u/${creation.author.username}`)}
        className="absolute bottom-1.5 left-1.5 z-[2] flex max-w-[calc(100%-0.75rem)] items-center gap-1.5 bg-fg/70 py-1 pl-1 pr-2 text-white"
      >
        <ProfileAvatar
          src={creation.author.avatarUrl}
          avatarConfig={creation.author.avatarConfig}
          userId={creation.author.id}
          alt=""
          size="xs"
          className="!h-5 !w-5"
        />
        <span className="truncate text-[11px] font-medium">@{creation.author.username}</span>
      </Link>
      ) : null}
    </article>
  )
}
