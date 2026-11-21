import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import {
  ExploreFilters,
  ExploreFollowingGuest,
  ExploreGallery,
} from "@/components/creations/ExploreGallery"
import { NewCreatorsStrip } from "@/components/creations/NewCreatorsStrip"
import { QuietRack } from "@/components/creations/QuietRack"
import { PageTransition } from "@/components/layout/PageTransition"
import { TileGridSkeleton } from "@/components/social/Skeleton"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { PageHeader } from "@/components/ui/PageHeader"
import { listFollowingIds } from "@/features/community/follows"
import {
  listNewCreators,
  listPublishedCreations,
  listQuietPublishedCreations,
} from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import {
  exploreHref,
  parseExploreCategory,
  parseExploreFeed,
  parseExploreSearch,
  type ExploreCategoryFilter,
  type ExploreFeed,
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
  searchParams: Promise<{ category?: string; q?: string; page?: string; feed?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const query = await searchParams
  const category = parseExploreCategory(query.category)
  const q = parseExploreSearch(query.q)
  const feed = parseExploreFeed(query.feed)
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)
  const showDiscovery = page === 1 && feed === "all" && category === "all" && !q

  return (
    <PageTransition>
      <div className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
        <PageHeader
          title={copy.exploreTitle[lang]}
          actions={
            showDiscovery ? (
              <Suspense fallback={null}>
                <NewCreatorsSlot lang={lang} />
              </Suspense>
            ) : null
          }
        />

        <div className="mt-4 min-w-0">
          <ExploreFilters lang={lang} category={category} q={q} feed={feed} />
        </div>

        <div className="mt-4 min-w-0">
          <Suspense fallback={<TileGridSkeleton />}>
            <ExploreResults lang={lang} category={category} q={q} page={page} feed={feed} />
          </Suspense>
        </div>

        {showDiscovery ? (
          <div className="mt-10 min-w-0 border-t border-[color:var(--soc-hairline)] pt-8">
            <Suspense fallback={null}>
              <QuietRackSlot lang={lang} />
            </Suspense>
          </div>
        ) : null}
      </div>
    </PageTransition>
  )
}

async function ExploreResults({
  lang,
  category,
  q,
  page,
  feed,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  page: number
  feed: ExploreFeed
}) {
  if (feed === "following") {
    const profile = await getCurrentProfile()
    if (!profile) return <ExploreFollowingGuest lang={lang} />

    const followingIds = await listFollowingIds(profile.id)
    const result = await listPublishedCreations({
      type: "pixel",
      category: category === "all" ? undefined : category,
      q: q || undefined,
      page,
      followingUserIds: followingIds,
      markNewSince: profile.activity_seen_at,
    })

    if (result.failed) {
      return (
        <SocialEmptyState
          title={copy.exploreLoadError[lang]}
          description={copy.exploreLoadHint[lang]}
          action={
            <Link
              href={exploreHref(lang, { category, q, page, feed })}
              className={socialButtonClass({ variant: "solid" })}
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
        feed={feed}
        page={result.page}
        pageCount={result.pageCount}
        items={result.items}
      />
    )
  }

  const result = await listPublishedCreations({
    type: "pixel",
    category: category === "all" ? undefined : category,
    q: q || undefined,
    page,
  })

  if (result.failed) {
    return (
      <SocialEmptyState
        title={copy.exploreLoadError[lang]}
        description={copy.exploreLoadHint[lang]}
        action={
          <Link
            href={exploreHref(lang, { category, q, page, feed })}
            className={socialButtonClass({ variant: "solid" })}
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
      feed={feed}
      page={result.page}
      pageCount={result.pageCount}
      items={result.items}
    />
  )
}

async function QuietRackSlot({ lang }: { lang: Lang }) {
  const quiet = await listQuietPublishedCreations(6)
  if (quiet.failed || quiet.items.length === 0) return null
  return <QuietRack lang={lang} items={quiet.items} />
}

async function NewCreatorsSlot({ lang }: { lang: Lang }) {
  const creators = await listNewCreators(12)
  if (creators.failed || creators.items.length === 0) return null
  return <NewCreatorsStrip lang={lang} items={creators.items} />
}
