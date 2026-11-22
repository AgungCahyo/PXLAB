import Link from "next/link"
import { CreatorCardList } from "@/components/creations/CreatorCardList"
import { DiscoveryNote } from "@/components/creations/DiscoveryNote"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreatorWorkPreview, NewCreatorCard } from "@/features/creations/queries"

/**
 * Discovery section 2: newly publishing creators. A compact horizontal rail so
 * each card keeps its artwork preview visible without turning into a portfolio.
 */
export function NewCreatorsStrip({
  lang,
  items,
  previews,
  followingIds,
  member,
  returnPath,
  currentUserId = null,
  failed = false,
  preserveScroll = false,
}: {
  lang: Lang
  items: NewCreatorCard[]
  previews: Record<string, CreatorWorkPreview[]>
  followingIds: Set<string>
  member: boolean
  returnPath: string
  currentUserId?: string | null
  failed?: boolean
  /** Links inside the Explore feed opt out of Next's automatic scroll. */
  preserveScroll?: boolean
}) {
  const creatorsHref = href(lang, "/creators")
  const restoreScrollProps = preserveScroll
    ? ({ scroll: false, "data-explore-resume": "true" } as const)
    : {}

  return (
    <section aria-labelledby="new-creators-heading" className="min-w-0">
      <SectionHeader
        id="new-creators-heading"
        title={copy.discoveryCreatorsTitle[lang]}
        actions={
          <Link
            {...restoreScrollProps}
            href={creatorsHref}
            className="inline-flex min-h-9 shrink-0 items-center text-[13px] text-muted hover:text-fg"
          >
            {copy.newCreatorsSeeAll[lang]}
          </Link>
        }
      />
      {failed || items.length === 0 ? (
        <DiscoveryNote>
          {failed ? copy.discoverySectionError[lang] : copy.discoveryCreatorsEmpty[lang]}
        </DiscoveryNote>
      ) : (
        <CreatorCardList
          lang={lang}
          items={items}
          previews={previews}
          followingIds={followingIds}
          member={member}
          returnPath={returnPath}
          currentUserId={currentUserId}
          layout="rail"
          label={copy.discoveryCreatorsTitle[lang]}
          preserveScroll={preserveScroll}
        />
      )}
    </section>
  )
}
