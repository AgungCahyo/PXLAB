import { CreatorCard, type CreatorCardData } from "@/components/creations/CreatorCard"
import type { CreatorWorkPreview } from "@/features/creations/queries"
import type { Lang } from "@/lib/i18n"

/**
 * One list for every creator surface. Rails stay compact; the Creators tab and
 * /creators fill their columns with the same fluid card.
 */
export function CreatorCardList({
  lang,
  items,
  previews,
  followingIds,
  member,
  returnPath,
  currentUserId = null,
  layout,
  label,
  preserveScroll = false,
}: {
  lang: Lang
  items: CreatorCardData[]
  previews: Record<string, CreatorWorkPreview[]>
  followingIds: Set<string>
  member: boolean
  returnPath: string
  currentUserId?: string | null
  layout: "rail" | "grid"
  label: string
  preserveScroll?: boolean
}) {
  const vertical = layout === "grid"

  return (
    <ul
      aria-label={label}
      className={
        vertical
          ? "mt-1 grid min-w-0 max-w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          : "mt-1 flex w-full min-w-0 max-w-full snap-x snap-mandatory flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
    >
      {items.map((creator) => (
        <li
          key={creator.id}
          className={vertical ? "min-w-0 max-w-full" : "min-w-0 max-w-full shrink-0 snap-start"}
        >
          <CreatorCard
            lang={lang}
            creator={creator}
            previews={previews[creator.id] ?? []}
            following={followingIds.has(creator.id)}
            member={member}
            returnPath={returnPath}
            currentUserId={currentUserId}
            preserveScroll={preserveScroll}
            fluid={vertical}
          />
        </li>
      ))}
    </ul>
  )
}
