import Link from "next/link"
import { CreationCard } from "@/components/creations/CreationCard"
import { copy } from "@/lib/copy"
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
      <p className="mt-4 text-[14px] text-muted">
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
    <section className="mt-8" aria-labelledby="remix-strip-heading">
      <h2 id="remix-strip-heading" className="text-[14px] font-medium text-fg">
        {copy.remixCount[lang].replace("{count}", String(total))}
      </h2>
      <ul className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="min-w-0">
            <CreationCard creation={item} lang={lang} artTransition={false} />
          </li>
        ))}
      </ul>
    </section>
  )
}
