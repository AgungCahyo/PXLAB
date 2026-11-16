import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ExploreFilters, ExploreGallery } from "@/components/creations/ExploreGallery"
import { GallerySkeleton } from "@/components/creations/GallerySkeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { listPublishedCreations } from "@/features/creations/queries"
import {
  exploreHref,
  parseExploreCategory,
  parseExploreSearch,
  type ExploreCategoryFilter,
} from "@/lib/creations"
import { copy } from "@/lib/copy"
import { isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return pageMeta({
    lang,
    path: "/explore",
    title: copy.exploreTitle,
    description: copy.exploreMeta,
  })
}

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; q?: string; page?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const query = await searchParams
  const category = parseExploreCategory(query.category)
  const q = parseExploreSearch(query.q)
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16">
      <h1 className="pixel-title">{copy.exploreTitle[lang]}</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{copy.exploreIntro[lang]}</p>
      <div className="mt-8">
        <ExploreFilters lang={lang} category={category} q={q} />
        <Suspense fallback={<GallerySkeleton />}>
          <ExploreResults lang={lang} category={category} q={q} page={page} />
        </Suspense>
      </div>
    </div>
  )
}

async function ExploreResults({
  lang,
  category,
  q,
  page,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  page: number
}) {
  const result = await listPublishedCreations({
    type: "pixel",
    category: category === "all" ? undefined : category,
    q: q || undefined,
    page,
  })

  if (result.failed) {
    return (
      <EmptyState
        title={copy.exploreLoadError[lang]}
        description={copy.exploreLoadHint[lang]}
        action={
          <Link
            href={exploreHref(lang, { category, q, page })}
            className={buttonClassName({ size: "sm" })}
          >
            {copy.exploreRetry[lang]}
          </Link>
        }
      />
    )
  }

  return (
    <ExploreGallery
      lang={lang}
      category={category}
      q={q}
      page={result.page}
      pageCount={result.pageCount}
      items={result.items}
    />
  )
}
