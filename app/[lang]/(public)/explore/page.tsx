import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import {
  ExploreFilters,
  ExploreFollowingGuest,
  ExploreGallery,
} from "@/components/creations/ExploreGallery"
import { NewCreatorsStrip } from "@/components/creations/NewCreatorsStrip"
import { QuietRack } from "@/components/creations/QuietRack"
import {
  SearchOverview,
  SearchOverviewSkeleton,
  relevantTagsForSearch,
} from "@/components/search/SearchResults"
import { CreatorRailSkeleton, QuietRailSkeleton, TileGridSkeleton } from "@/components/social/Skeleton"
import { SectionHeader } from "@/components/ui/PageHeader"
import { listFollowingIds } from "@/features/community/follows"
import {
  listCreatorWorkPreviews,
  listNewCreators,
  listPublishedCreations,
  listQuietPublishedCreations,
  type CreationCard,
} from "@/features/creations/queries"
import { searchCreators } from "@/features/profiles/queries"
import { getCurrentProfile, type MemberProfile } from "@/lib/auth/session"
import {
  exploreHref,
  parseExploreCategory,
  parseExploreFeed,
  parseExploreScope,
  parseExploreSearch,
  parseExploreTag,
  type ExploreCategoryFilter,
  type ExploreFeed,
  type ExploreScope,
} from "@/lib/creations"
import { copy } from "@/lib/copy"
import { isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { EXPLORE_PAGE_SIZE, SEARCH_MIN_LENGTH } from "@/lib/site"

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
  searchParams: Promise<{
    category?: string
    q?: string
    tag?: string
    page?: string
    feed?: string
    scope?: string
  }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const query = await searchParams
  const category = parseExploreCategory(query.category)
  const tag = parseExploreTag(query.tag)
  const q = parseExploreSearch(query.q || (tag ? `#${tag}` : ""))
  const activeQ = q.length >= SEARCH_MIN_LENGTH ? q : ""
  const feed = parseExploreFeed(query.feed)
  const scope = parseExploreScope(query.scope)
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1)
  const showDiscovery = page === 1 && feed === "all" && category === "all" && !activeQ

  // One viewer lookup for the whole page: follow state, Following feed and login links.
  const viewer = await getCurrentProfile()
  const following = viewer ? await listFollowingIds(viewer.id) : []
  const followingSet = new Set(following)
  const member = Boolean(viewer)
  const returnPath = exploreHref(lang, { category, q, feed, scope })

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <h1 className="sr-only">{copy.exploreTitle[lang]}</h1>

      <ExploreFilters lang={lang} category={category} q={q} feed={feed} scope={scope} />

      {activeQ ? (
        <div className="mt-3 min-w-0 sm:mt-4">
          <Suspense fallback={<SearchOverviewSkeleton scope={scope} />}>
            <ExploreResults
              lang={lang}
              category={category}
              q={activeQ}
              page={page}
              feed={feed}
              scope={scope}
              viewer={viewer}
              following={following}
              followingSet={followingSet}
              member={member}
              returnPath={returnPath}
            />
          </Suspense>
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 gap-6 sm:gap-7">
          {/*
           * Discovery mode keeps its three sections distinct: artwork discovery,
           * new creators, then works that still need exposure.
           */}
          <section aria-labelledby="explore-works-heading" className="min-w-0">
            <SectionHeader id="explore-works-heading" title={copy.discoveryWorksTitle[lang]} />
            <div className="mt-2">
              <Suspense fallback={<TileGridSkeleton count={EXPLORE_PAGE_SIZE} />}>
                <ExploreResults
                  lang={lang}
                  category={category}
                  q=""
                  page={page}
                  feed={feed}
                  scope={scope}
                  viewer={viewer}
                  following={following}
                  followingSet={followingSet}
                  member={member}
                  returnPath={returnPath}
                />
              </Suspense>
            </div>
          </section>

          {showDiscovery ? (
            <>
              <Suspense
                fallback={
                  <div className="min-w-0">
                    <SectionHeader
                      id="new-creators-heading"
                      title={copy.discoveryCreatorsTitle[lang]}
                    />
                    <CreatorRailSkeleton />
                  </div>
                }
              >
                <NewCreatorsSlot
                  lang={lang}
                  followingSet={followingSet}
                  member={member}
                  returnPath={returnPath}
                  currentUserId={viewer?.id ?? null}
                />
              </Suspense>

              <Suspense
                fallback={
                  <div className="min-w-0">
                    <SectionHeader
                      id="quiet-rack-heading"
                      title={copy.discoveryQuietTitle[lang]}
                    />
                    <QuietRailSkeleton />
                  </div>
                }
              >
                <QuietRackSlot lang={lang} />
              </Suspense>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

async function ExploreResults({
  lang,
  category,
  q,
  page,
  feed,
  scope,
  viewer,
  following,
  followingSet,
  member,
  returnPath,
}: {
  lang: Lang
  category: ExploreCategoryFilter
  q: string
  page: number
  feed: ExploreFeed
  scope: ExploreScope
  viewer: MemberProfile | null
  following: string[]
  followingSet: Set<string>
  member: boolean
  returnPath: string
}) {
  const emptyWorks: {
    items: CreationCard[]
    total: number
    page: number
    pageCount: number
    failed: boolean
  } = { items: [], total: 0, page, pageCount: 1, failed: false }
  const guestFollowing = feed === "following" && !viewer
  const creatorSearch = q && scope !== "creations" ? await searchCreators(q) : null
  const creatorItems = creatorSearch
    ? viewer?.id
      ? creatorSearch.items.filter((creator) => creator.id !== viewer.id)
      : creatorSearch.items
    : []
  const creators = creatorSearch
    ? {
        ...creatorSearch,
        items: creatorItems,
        total: viewer?.id ? creatorItems.length : creatorSearch.total,
      }
    : { items: [], total: 0, failed: false }
  const creatorPreviews =
    creators.items.length > 0
      ? await listCreatorWorkPreviews(creators.items.map((creator) => creator.id))
      : {}

  // The creators tab must not fetch or render the creation feed.
  if (q && scope === "creators") {
    return (
      <SearchOverview
        lang={lang}
        q={q}
        category={category}
        feed={feed}
        scope={scope}
        creators={creators}
        creatorPreviews={creatorPreviews}
        followingIds={followingSet}
        member={member}
        returnPath={returnPath}
        currentUserId={viewer?.id ?? null}
        works={[]}
        worksTotal={0}
        worksFailed={false}
        worksPage={page}
        worksPageCount={1}
        tags={[]}
      />
    )
  }

  if (!q && guestFollowing) {
    return <ExploreFollowingGuest lang={lang} />
  }

  const result =
    guestFollowing
      ? emptyWorks
      : feed === "following" && viewer
        ? await listPublishedCreations({
            type: "pixel",
            category: category === "all" ? undefined : category,
            q: q || undefined,
            page,
            followingUserIds: following,
            markNewSince: viewer.activity_seen_at,
          })
        : await listPublishedCreations({
            type: "pixel",
            category: category === "all" ? undefined : category,
            q: q || undefined,
            page,
          })

  // Search owns its result sections and its single empty state per scope.
  if (q) {
    return (
      <SearchOverview
        lang={lang}
        q={q}
        category={category}
        feed={feed}
        scope={scope}
        creators={creators}
        creatorPreviews={creatorPreviews}
        followingIds={followingSet}
        member={member}
        returnPath={returnPath}
        currentUserId={viewer?.id ?? null}
        works={result.items}
        worksTotal={result.total}
        worksFailed={result.failed}
        worksPage={result.page}
        worksPageCount={result.pageCount}
        tags={scope === "all" ? relevantTagsForSearch(result.items, q) : []}
        guestFollowing={guestFollowing}
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
      failed={result.failed}
    />
  )
}

async function QuietRackSlot({ lang }: { lang: Lang }) {
  const quiet = await listQuietPublishedCreations(6)
  return <QuietRack lang={lang} items={quiet.items} failed={quiet.failed} preserveScroll />
}

async function NewCreatorsSlot({
  lang,
  followingSet,
  member,
  returnPath,
  currentUserId,
}: {
  lang: Lang
  followingSet: Set<string>
  member: boolean
  returnPath: string
  currentUserId: string | null
}) {
  const creators = await listNewCreators(12, currentUserId)
  const previews = await listCreatorWorkPreviews(creators.items.map((creator) => creator.id))
  return (
    <NewCreatorsStrip
      lang={lang}
      items={creators.items}
      previews={previews}
      followingIds={followingSet}
      member={member}
      returnPath={returnPath}
      currentUserId={currentUserId}
      failed={creators.failed}
      preserveScroll
    />
  )
}
