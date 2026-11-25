import Link from "next/link"
import { FollowButton } from "@/components/community/FollowButton"
import { PixelArt } from "@/components/creations/PixelArt"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import type { CreatorWorkPreview } from "@/features/creations/queries"
import type { AvatarConfig } from "@/lib/avatar-gen"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * One compact creator identity used by every discovery surface: New creators,
 * search All and search Creators. The viewer is filtered upstream, and the
 * card also refuses to render itself. Header links and Follow are siblings,
 * and each artwork preview is its own link — no nested controls.
 */
export type CreatorCardData = {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  avatarConfig: AvatarConfig | null
}

export function CreatorCard({
  lang,
  creator,
  previews = [],
  following,
  member,
  returnPath,
  currentUserId = null,
  preserveScroll = false,
  fluid = false,
  className,
}: {
  lang: Lang
  creator: CreatorCardData
  previews?: CreatorWorkPreview[]
  following: boolean
  member: boolean
  returnPath: string
  /** Authenticated viewer id; ownership is compared by id, never by name. */
  currentUserId?: string | null
  preserveScroll?: boolean
  /** Fill the grid column in the Creators tab; rails keep the compact width. */
  fluid?: boolean
  className?: string
}) {
  const isSelf = Boolean(currentUserId && currentUserId === creator.id)
  if (isSelf) return null

  const name = creator.displayName?.trim() || creator.username
  const profileHref = href(lang, `/u/${creator.username}`)
  const restoreScrollProps = preserveScroll
    ? ({ scroll: false, "data-explore-resume": "true" } as const)
    : {}

  return (
    <article
      data-creator-card
      className={cn(
        fluid
          ? "w-full max-w-full min-w-0 overflow-hidden bg-card p-2.5"
          : "w-64 max-w-full shrink-0 min-w-0 overflow-hidden bg-card p-2.5",
        className,
      )}
    >
      <div className="flex min-w-0 max-w-full items-start gap-3">
        <Link
          {...restoreScrollProps}
          href={profileHref}
          aria-label={name}
          className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
        >
          <ProfileAvatar
            src={creator.avatarUrl}
            avatarConfig={creator.avatarConfig}
            userId={creator.id}
            alt=""
            size="sm"
            className="border border-slate-200/80"
          />
        </Link>
        <Link
          {...restoreScrollProps}
          href={profileHref}
          className="min-w-0 max-w-full flex-1 overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
        >
          <span className="block truncate text-[14px] font-semibold leading-tight text-fg transition-colors hover:text-[#6355d8]">
            {name}
          </span>
          <span className="mt-0.5 block truncate text-[12px] leading-tight text-muted">
            @{creator.username}
          </span>
        </Link>
        <FollowButton
          lang={lang}
          userId={creator.id}
          username={creator.username}
          initialFollowing={following}
          isMember={member}
          returnPath={returnPath}
          compact
        />
      </div>

      {previews.length > 0 ? (
        <ul
          aria-label={copy.discoveryPreviewAria[lang]}
          className="mt-3 grid min-w-0 max-w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-2"
        >
          {previews.slice(0, 3).map((preview, index) => (
            <li key={preview.id} className="min-w-0 max-w-full">
              <Link
                {...restoreScrollProps}
                href={href(lang, `/creation/${preview.id}`)}
                aria-label={preview.title}
                className="block min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-all hover:border-slate-200 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky"
              >
                {preview.coverUrl ? (
                  <PixelArt
                    src={preview.coverUrl}
                    alt=""
                    variant="thumb"
                    framed={false}
                    priority={index === 0}
                  />
                ) : (
                  <span className="block aspect-square w-full bg-slate-100" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/60 px-3 py-4 text-center text-[12px] text-muted">
          {copy.creatorCardNoWork[lang]}
        </p>
      )}
    </article>
  )
}
