import Link from "next/link"
import { FollowButton } from "@/components/community/FollowButton"
import { CreationCard } from "@/components/creations/CreationCard"
import {
  recommendationStripItemClass,
  recommendationStripListClass,
} from "@/components/creations/RecommendationRack"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { CreationAuthor, CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreatorBlock({
  lang,
  author,
  authorId,
  otherWorks,
  following,
  canFollow,
  returnPath,
  publishedLabel = null,
  flush = false,
}: {
  lang: Lang
  author: CreationAuthor
  authorId: string
  otherWorks: CreationCardData[]
  following: boolean
  canFollow: boolean
  returnPath: string
  /** Optional date / size line under the creator name. */
  publishedLabel?: string | null
  /** Sit directly under artwork — no section rule; other works render separately. */
  flush?: boolean
}) {
  const name = author.displayName?.trim() || author.username
  const bioLine = author.bio?.replace(/\s+/g, " ").trim() ?? ""
  const profileHref = href(lang, `/u/${author.username}`)
  const showOtherWorks = !flush && otherWorks.length > 0

  return (
    <section
      className={cn(!flush && "mt-10 border-t-[3px] border-earth pt-8")}
      aria-labelledby="creator-block-heading"
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <Link
          href={profileHref}
          className="shrink-0 border-[3px] border-earth bg-card p-0.5 shadow-[4px_4px_0_0_var(--fg)]"
        >
          <ProfileAvatar
            src={author.avatarUrl}
            avatarConfig={author.avatarConfig}
            userId={authorId}
            alt={name}
            size="sm"
            className="border-0 sm:h-16 sm:w-16"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="creator-block-heading" className="text-[15px] font-medium text-fg sm:text-[1.0625rem]">
                <Link href={profileHref} className="hover:underline">
                  {name}
                </Link>
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-muted">
                <Link href={profileHref} className="hover:text-fg">
                  @{author.username}
                </Link>
                {publishedLabel ? ` · ${publishedLabel}` : ""}
              </p>
            </div>
            {canFollow ? (
              <FollowButton
                lang={lang}
                userId={authorId}
                username={author.username}
                initialFollowing={following}
                member
                returnPath={returnPath}
              />
            ) : null}
          </div>
          {bioLine ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-[14px] leading-snug text-muted">
              {bioLine}
            </p>
          ) : null}
        </div>
      </div>

      {showOtherWorks ? (
        <CreatorOtherWorks lang={lang} username={author.username} items={otherWorks} />
      ) : null}
    </section>
  )
}

/** Gallery of more works from the same creator (detail page section). */
export function CreatorOtherWorks({
  lang,
  username,
  items,
}: {
  lang: Lang
  username: string
  items: CreationCardData[]
}) {
  if (items.length === 0) return null

  return (
    <section
      className="mt-8 border-t-[3px] border-earth pt-6"
      aria-labelledby="creator-other-works-heading"
    >
      <SectionHeader
        id="creator-other-works-heading"
        title={copy.creatorOtherWorks[lang].replace("{username}", username)}
      />
      <ul className={recommendationStripListClass}>
        {items.map((item) => (
          <li key={item.id} className={recommendationStripItemClass}>
            <CreationCard creation={item} lang={lang} showAuthor={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
