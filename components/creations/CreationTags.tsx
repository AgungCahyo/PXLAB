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
            className="inline-flex min-h-9 items-center rounded-full border border-slate-200/80 bg-slate-50 px-3 text-[12px] font-medium text-muted transition-colors hover:border-slate-300 hover:bg-white hover:text-fg"
          >
            {formatCreationTag(tag)}
          </Link>
        </li>
      ))}
    </ul>
  )
}
