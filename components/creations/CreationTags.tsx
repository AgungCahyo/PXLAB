import Link from "next/link"
import { exploreHref, formatCreationTag } from "@/lib/creations"
import { type Lang } from "@/lib/i18n"

/** Detail page: linked tags → Explore ?tag= (filter wired in M5). */
export function CreationTags({ lang, tags }: { lang: Lang; tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={exploreHref(lang, { tag })}
            className="inline-flex border-[2px] border-earth bg-card px-2 py-1 text-[12px] font-medium text-fg hover:bg-soft"
          >
            {formatCreationTag(tag)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
