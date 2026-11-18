import Link from "next/link"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { NewCreatorCard } from "@/features/creations/queries"

const VISIBLE = 5

/** Compact overlapping avatar stack for the Explore header → /creators. */
export function NewCreatorsStrip({
  lang,
  items,
}: {
  lang: Lang
  items: NewCreatorCard[]
}) {
  if (items.length === 0) return null

  const faces = items.slice(0, VISIBLE)
  const overflow = Math.max(0, items.length - faces.length)
  const creatorsHref = href(lang, "/creators")

  return (
    <div className="flex shrink-0 items-center gap-3">
      <ul className="flex items-center ps-1" aria-label={copy.newCreatorsTitle[lang]}>
        {faces.map((creator, index) => {
          const name = creator.displayName?.trim() || creator.username
          return (
            <li
              key={creator.username}
              className="relative transition-transform duration-200 ease-out hover:z-20 hover:-translate-y-1 focus-within:z-20 focus-within:-translate-y-1"
              style={{ marginInlineStart: index === 0 ? 0 : -14, zIndex: index + 1 }}
            >
              <Link
                href={href(lang, `/u/${creator.username}`)}
                className="block outline-offset-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-brick"
                title={`@${creator.username}`}
              >
                <ProfileAvatar
                  src={creator.avatarUrl}
                  avatarConfig={creator.avatarConfig}
                  userId={creator.id}
                  alt={name}
                  size="sm"
                  className="ring-[3px] ring-bg shadow-[3px_3px_0_0_var(--earth)]"
                />
              </Link>
            </li>
          )
        })}
        {overflow > 0 ? (
          <li
            className="relative z-10"
            style={{ marginInlineStart: -14, zIndex: faces.length + 1 }}
          >
            <Link
              href={creatorsHref}
              className="flex h-10 w-10 items-center justify-center border-[3px] border-earth bg-brick text-[11px] font-medium text-white shadow-[3px_3px_0_0_var(--fg)] ring-[3px] ring-bg outline-offset-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-brick"
              aria-label={copy.newCreatorsMore[lang].replace("{count}", String(overflow))}
              title={copy.newCreatorsSeeAll[lang]}
            >
              +{overflow}
            </Link>
          </li>
        ) : null}
      </ul>
      <Link
        href={creatorsHref}
        className="text-[13px] text-muted hover:text-fg"
      >
        {copy.newCreatorsSeeAll[lang]}
      </Link>
    </div>
  )
}
