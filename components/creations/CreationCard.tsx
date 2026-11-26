import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreationCard({
  creation,
  lang,
  hrefPath,
  showAuthor = true,
  footer,
}: {
  creation: CreationCardData
  lang: Lang
  hrefPath?: string
  /** Hide @username on profile grids where the author is already known. */
  showAuthor?: boolean
  /** Optional card-bottom action area (e.g. Restore button on Archive). */
  footer?: React.ReactNode
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
    <div className="pixel-thumb bg-slate-100" />
  )

  return (
    <article className="pixel-frame group relative flex h-full min-w-0 flex-col overflow-hidden rounded-none border border-line bg-card transition-colors duration-150 hover:border-fg/40">
      <Link
        href={href(lang, path)}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ff4f00]"
        aria-label={title}
      />
      <div className="pointer-events-none relative z-[1] flex h-full flex-col">
        <div className="relative aspect-square w-full overflow-hidden border-b border-line bg-soft">
          {thumb}
          {creation.isNew ? (
            <span className="absolute left-2 top-2 rounded-[2px] bg-[#ff4f00] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
              {copy.feedNewBadge[lang]}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug text-fg transition-colors group-hover:text-[#ff4f00] sm:text-[15px]">
              {title}
            </p>
            {showAuthor ? (
              <div className="pointer-events-auto relative z-[2] mt-2 flex min-w-0 items-center gap-2">
                <Link href={profileHref} className="flex min-w-0 items-center gap-2 transition-colors hover:text-[#ff4f00]">
                  <ProfileAvatar
                    src={creation.author.avatarUrl}
                    avatarConfig={creation.author.avatarConfig}
                    userId={creation.author.id}
                    alt={creation.author.username}
                    size="xs"
                    className="border border-line"
                  />
                  <span className="truncate text-[12px] font-medium text-muted">@{creation.author.username}</span>
                </Link>
              </div>
            ) : null}
          </div>

          {sizeLabel || notes ? (
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2 text-[11px] font-medium tabular-nums text-muted">
              {sizeLabel ? (
                <span className="uppercase tracking-[0.05em]">
                  {sizeLabel}
                </span>
              ) : null}
              {notes ? <span className="truncate">{notes}</span> : null}
            </div>
          ) : null}
          {footer ? (
            <div className="pointer-events-auto relative z-[2] mt-2.5 border-t border-line pt-2.5">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
