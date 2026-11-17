import Link from "next/link"
import { FollowButton } from "@/components/community/FollowButton"
import { CreationCard } from "@/components/creations/CreationCard"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationAuthor, CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreatorBlock({
  lang,
  author,
  authorId,
  otherWorks,
  following,
  canFollow,
  returnPath,
}: {
  lang: Lang
  author: CreationAuthor
  authorId: string
  otherWorks: CreationCardData[]
  following: boolean
  canFollow: boolean
  returnPath: string
}) {
  const name = author.displayName?.trim() || author.username
  const bioLine = author.bio?.replace(/\s+/g, " ").trim() ?? ""
  const profileHref = href(lang, `/u/${author.username}`)

  return (
    <section className="mt-10 border-t border-line pt-8" aria-labelledby="creator-block-heading">
      <div className="flex min-w-0 items-start gap-3">
        <Link href={profileHref} className="shrink-0">
          <ProfileAvatar src={author.avatarUrl} alt={name} size="sm" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="creator-block-heading" className="text-[15px] font-medium text-fg">
                <Link href={profileHref} className="hover:underline">
                  {name}
                </Link>
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                <Link href={profileHref} className="hover:text-fg">
                  @{author.username}
                </Link>
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
            <p className="mt-2 line-clamp-2 text-[14px] leading-snug text-muted">{bioLine}</p>
          ) : null}
        </div>
      </div>

      {otherWorks.length > 0 ? (
        <div className="mt-6">
          <p className="text-[14px] font-medium text-fg">
            {copy.creatorOtherWorks[lang].replace("{username}", author.username)}
          </p>
          <ul className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
            {otherWorks.map((item) => (
              <li key={item.id} className="min-w-0">
                <CreationCard creation={item} lang={lang} showAuthor={false} artTransition={false} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
