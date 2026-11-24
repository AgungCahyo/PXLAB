import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
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
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <Link
        href={href(lang, path)}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400/60"
        aria-label={title}
      />
      <div className="pointer-events-none relative z-[1] flex h-full flex-col">
        <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
          {thumb}
          {creation.isNew ? (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[#f43f5e] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              {copy.feedNewBadge[lang]}
            </span>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/5 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
        </div>

        <div className="flex flex-1 flex-col justify-between p-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-snug text-fg transition-colors group-hover:text-[#6355d8] sm:text-[15px]">
              {title}
            </p>
            {showAuthor ? (
              <div className="pointer-events-auto relative z-[2] mt-2 flex min-w-0 items-center gap-2">
                <Link href={profileHref} className="flex min-w-0 items-center gap-2 transition-colors hover:text-[#6355d8]">
                  <ProfileAvatar
                    src={creation.author.avatarUrl}
                    avatarConfig={creation.author.avatarConfig}
                    userId={creation.author.id}
                    alt={creation.author.username}
                    size="xs"
                    className="border border-slate-200/80"
                  />
                  <span className="truncate text-[12px] font-medium text-muted">@{creation.author.username}</span>
                </Link>
              </div>
            ) : null}
          </div>

          {sizeLabel || notes ? (
            <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-muted">
              {sizeLabel ? (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                  {sizeLabel}
                </span>
              ) : null}
              {notes ? <span className="truncate">{notes}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
