import { DiscoveryNote } from "@/components/creations/DiscoveryNote"
import { WorkTile } from "@/components/social/WorkTile"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

/**
 * Discovery section 3: recent works with no published comment yet. Same tiles as
 * the main grid so the section reads as part of the feed, not a pasted widget.
 */
export function QuietRack({
  lang,
  items,
  failed = false,
  preserveScroll = false,
}: {
  lang: Lang
  items: CreationCardData[]
  failed?: boolean
  /** Forwarded to tiles when this rack is an Explore interlude. */
  preserveScroll?: boolean
}) {
  return (
    <section aria-labelledby="quiet-rack-heading" className="min-w-0">
      <SectionHeader
        id="quiet-rack-heading"
        title={copy.discoveryQuietTitle[lang]}
        hint={copy.discoveryQuietHint[lang]}
      />
      {failed || items.length === 0 ? (
        <DiscoveryNote>
          {failed ? copy.discoverySectionError[lang] : copy.discoveryQuietEmpty[lang]}
        </DiscoveryNote>
      ) : (
        <ul
          aria-label={copy.discoveryQuietTitle[lang]}
          className="-mx-3 mt-2 flex min-w-0 snap-x snap-mandatory flex-nowrap gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className="aspect-square w-40 shrink-0 snap-start sm:w-44">
              <WorkTile creation={item} lang={lang} preserveScroll={preserveScroll} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
