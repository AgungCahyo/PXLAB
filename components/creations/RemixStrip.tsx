import Link from "next/link"
import {
  recommendationStripItemClass,
  recommendationStripListClass,
} from "@/components/creations/RecommendationRack"
import { WorkTile } from "@/components/social/WorkTile"
import { SectionHeader } from "@/components/ui/PageHeader"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function RemixStrip({
  lang,
  items,
  total,
  source,
}: {
  lang: Lang
  items: CreationCardData[]
  total: number
  source?: { id: string; title: string; authorUsername: string } | null
}) {
  if (source) {
    return (
      <p className="mt-3 text-[13px] text-muted sm:text-[14px]">
        {copy.remixFrom[lang]}{" "}
        <Link href={href(lang, `/u/${source.authorUsername}`)} className="hover:text-fg">
          @{source.authorUsername}
        </Link>
        {" · "}
        <Link href={href(lang, `/creation/${source.id}`)} className="hover:text-fg">
          {source.title}
        </Link>
      </p>
    )
  }

  if (total <= 0 || items.length === 0) return null

  return (
    <section
      className="mt-8 border-t border-line pt-6"
      aria-labelledby="remix-strip-heading"
    >
      <SectionHeader
        id="remix-strip-heading"
        title={copy.remixCount[lang].replace("{count}", String(total))}
      />
      <ul className={recommendationStripListClass}>
        {items.map((item) => (
          <li key={item.id} className={recommendationStripItemClass}>
            <WorkTile creation={item} lang={lang} />
          </li>
        ))}
      </ul>
    </section>
  )
}
