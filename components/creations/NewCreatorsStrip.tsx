import Link from "next/link"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { socialCopy } from "@/lib/copy-social"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { NewCreatorCard } from "@/features/creations/queries"

const VISIBLE = 12

/**
 * "New creators" band inside the Explore feed: a stories-style row of avatars.
 * Each avatar goes to the profile; "See all" goes to /creators.
 */
export function NewCreatorsStrip({
  lang,
  items,
}: {
  lang: Lang
  items: NewCreatorCard[]
}) {
  if (items.length === 0) return null
  const creatorsHref = href(lang, "/creators")

  return (
    <section aria-labelledby="new-creators-heading" className="min-w-0 py-2">
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h2 id="new-creators-heading" className="text-[15px] font-semibold text-fg">
          {socialCopy.explore.creatorsTitle[lang]}
        </h2>
        <Link
          href={creatorsHref}
          className="inline-flex min-h-9 shrink-0 items-center text-[13px] text-muted hover:text-fg"
        >
          {copy.newCreatorsSeeAll[lang]}
        </Link>
      </div>
      <ul
        aria-label={copy.newCreatorsTitle[lang]}
        className="-mx-3 mt-1 flex min-w-0 flex-nowrap gap-4 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.slice(0, VISIBLE).map((creator) => {
          const name = creator.displayName?.trim() || creator.username
          return (
            <li key={creator.username} className="w-[4.5rem] shrink-0">
              <Link
                href={href(lang, `/u/${creator.username}`)}
                className="flex flex-col items-center gap-1.5 text-center"
                title={name}
              >
                <ProfileAvatar
                  src={creator.avatarUrl}
                  avatarConfig={creator.avatarConfig}
                  userId={creator.id}
                  alt=""
                  size="sm"
                />
                <span className="w-full truncate text-[12px] text-fg">@{creator.username}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
