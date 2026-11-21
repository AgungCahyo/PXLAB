import { WorkTile } from "@/components/social/WorkTile"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

/**
 * "Be the first to comment" band inside the Explore feed: recent works that still have no
 * comments. Same tiles as the grid, so it reads as part of the feed, not a pasted widget.
 */
export function QuietRack({
  lang,
  items,
}: {
  lang: Lang
  items: CreationCardData[]
}) {
  if (items.length === 0) return null
  const t = socialCopy.explore

  return (
    <section aria-labelledby="quiet-rack-heading" className="min-w-0 bg-soft px-3 py-3 sm:px-4">
      <h2 id="quiet-rack-heading" className="text-[15px] font-semibold text-fg">
        {t.quietTitle[lang]}
      </h2>
      <p className="mt-0.5 text-[13px] text-muted">{t.quietHint[lang]}</p>
      <ul className="-mx-3 mt-3 flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 6).map((item) => (
          <li key={item.id} className="aspect-square w-40 shrink-0 sm:w-44">
            <WorkTile creation={item} lang={lang} />
          </li>
        ))}
      </ul>
    </section>
  )
}
