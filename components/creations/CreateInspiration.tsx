import Link from "next/link"
import { WorkTile } from "@/components/social/WorkTile"
import { copy, creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"
import type { CreationCategory } from "@/lib/site"

const INSPIRATION_SIZES: CreationCategory[] = ["icon", "small", "sprite"]

export function CreateInspiration({
  lang,
  bySize,
}: {
  lang: Lang
  bySize: Partial<Record<CreationCategory, CreationCardData[]>>
}) {
  const sections = INSPIRATION_SIZES.map((size) => ({
    size,
    items: bySize[size] ?? [],
    label: creationCategoryLabels[size][lang],
  })).filter((section) => section.items.length > 0)

  return (
    <section
      className="mt-8 border-t border-[color:var(--soc-hairline)] pt-6"
      aria-labelledby="create-inspiration-heading"
    >
      <h2 id="create-inspiration-heading" className="text-[15px] font-medium text-fg">
        {copy.createInspirationTitle[lang]}
      </h2>
      <p className="mt-2 text-[14px]">
        <Link
          href={href(lang, "/explore")}
          className="text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {copy.createRemixPrompt[lang]}
        </Link>
      </p>
      {sections.length === 0 ? null : (
        <div className="mt-6 grid gap-8">
          {sections.map((section) => (
            <div key={section.size}>
              <p className="text-[14px] font-medium text-fg">
                {copy.createInspirationSize[lang].replace("{size}", section.label)}
              </p>
              <ul className="mt-3 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
                {section.items.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <WorkTile creation={item} lang={lang} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
