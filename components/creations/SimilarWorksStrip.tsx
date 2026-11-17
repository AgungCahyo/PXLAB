import { CreationCard } from "@/components/creations/CreationCard"
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
    <section className="mt-10 border-t border-line pt-8" aria-labelledby="similar-works-heading">
      <h2 id="similar-works-heading" className="text-[15px] font-medium text-fg">
        {copy.similarWorksTitle[lang]}
      </h2>
      <ul className="mt-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
                <CreationCard creation={item} lang={lang} artTransition={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
