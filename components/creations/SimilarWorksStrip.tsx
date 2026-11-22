import { CreationCard } from "@/components/creations/CreationCard"
import {
  recommendationStripItemClass,
  recommendationStripListClass,
} from "@/components/creations/RecommendationRack"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function SimilarWorksStrip({
  lang,
  items,
}: {
  lang: Lang
  items: CreationCardData[]
}) {
  if (items.length === 0) return null

  return (
    <section
      className="mt-8 border-t-[3px] border-earth pt-6"
      aria-labelledby="similar-works-heading"
    >
      <SectionHeader id="similar-works-heading" title={copy.similarWorksTitle[lang]} />
      <ul className={recommendationStripListClass}>
        {items.map((item) => (
          <li key={item.id} className={recommendationStripItemClass}>
            <CreationCard creation={item} lang={lang} />
          </li>
        ))}
      </ul>
    </section>
  )
}
