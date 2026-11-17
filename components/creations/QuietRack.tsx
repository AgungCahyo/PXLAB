import { CreationCard } from "@/components/creations/CreationCard"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

/** Thin horizontal discovery strip — does not compete with the main gallery grid. */
export function QuietRack({
  lang,
  items,
}: {
  lang: Lang
  items: CreationCardData[]
}) {
  if (items.length === 0) return null

  const shown = items.slice(0, 6)

  return (
    <section className="min-w-0" aria-labelledby="quiet-rack-heading">
      <h2 id="quiet-rack-heading" className="text-[15px] font-medium text-fg">
        {copy.quietRackTitle[lang]}
      </h2>
      <p className="mt-0.5 text-[13px] text-muted">{copy.quietRackHint[lang]}</p>
      <ul className="mt-3 flex min-w-0 flex-nowrap gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shown.map((item) => (
          <li key={item.id} className="w-[9.5rem] shrink-0 sm:w-[10.5rem]">
            <CreationCard creation={item} lang={lang} artTransition={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
