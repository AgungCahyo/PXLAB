import Link from "next/link"
import { exploreHref, formatCreationTag } from "@/lib/creations"
import { type Lang } from "@/lib/i18n"

/** Detail page: linked tags → Explore ?tag= (filter wired in M5). */
export function CreationTags({ lang, tags }: { lang: Lang; tags: string[] }) {
  if (tags.length === 0) return null

  return (
    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {tags.map((tag) => (
        <li key={tag}>
          <Link
            href={exploreHref(lang, { tag })}
            className="text-[13px] text-muted underline-offset-2 hover:text-fg hover:underline"
          >
            {formatCreationTag(tag)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
