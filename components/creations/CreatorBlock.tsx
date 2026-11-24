import { FollowButton } from "@/components/community/FollowButton"
import {
  recommendationStripItemClass,
  recommendationStripListClass,
} from "@/components/creations/RecommendationRack"
import { CreatorLine } from "@/components/social/CreatorLine"
import { WorkTile } from "@/components/social/WorkTile"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { CreationAuthor, CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreatorBlock({
  lang,
  author,
  authorId,
  otherWorks,
  following,
  canFollow,
  member,
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
  member: boolean
  returnPath: string
  /** Optional date / size line under the creator name. */
  publishedLabel?: string | null
  /** Sit directly under artwork — no section rule; other works render separately. */
  flush?: boolean
}) {
  const showOtherWorks = !flush && otherWorks.length > 0

  return (
    <section
      className={cn(!flush && "mt-8 border-t border-[color:var(--soc-hairline)] pt-6")}
      aria-labelledby="creator-block-heading"
    >
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <h2 id="creator-block-heading" className="sr-only">
            {author.displayName?.trim() || author.username}
          </h2>
          <CreatorLine
            lang={lang}
            creator={{
              id: authorId,
              username: author.username,
              displayName: author.displayName,
              avatarUrl: author.avatarUrl,
              avatarConfig: author.avatarConfig,
            }}
          />
          {publishedLabel ? (
            <p className="mt-1 truncate pl-[3.125rem] text-[12px] text-muted">{publishedLabel}</p>
          ) : null}
        </div>
        {canFollow ? (
          <FollowButton
            lang={lang}
            userId={authorId}
            username={author.username}
            initialFollowing={following}
            member={member}
            returnPath={returnPath}
            compact
          />
        ) : null}
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
      className="mt-8 border-t border-slate-200/80 pt-6"
      aria-labelledby="creator-other-works-heading"
    >
      <SectionHeader
        id="creator-other-works-heading"
        title={copy.creatorOtherWorks[lang].replace("{username}", username)}
      />
      <ul className={recommendationStripListClass}>
        {items.map((item) => (
          <li key={item.id} className={recommendationStripItemClass}>
            <WorkTile creation={item} lang={lang} showAuthor={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
