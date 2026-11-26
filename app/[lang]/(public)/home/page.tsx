import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { HomeExploreSidebar } from "@/components/home/HomeExploreSidebar"
import { HomeFeedTabs } from "@/components/home/HomeFeedTabs"
import type { FeedViewer } from "@/components/social/CommentPanel"
import { HomeFeed } from "@/components/social/HomeFeed"
import { FeedSkeleton } from "@/components/social/Skeleton"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { listFollowingIds } from "@/features/community/follows"
import { listPopularCreationTags } from "@/features/creations/queries"
import { listHomeFeed, type FeedKind } from "@/features/feed/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { socialCopy } from "@/lib/copy-social"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { loginHref } from "@/lib/paths"
import { EXPLORE_PAGE_SIZE } from "@/lib/site"

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
    path: "/home",
    title: socialCopy.feed.title,
    description: socialCopy.feed.meta,
  })
}

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ feed?: string; page?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const query = await searchParams
  const feed: FeedKind = query.feed === "following" ? "following" : "all"
  const page = Math.max(1, Math.min(500, Number.parseInt(query.page ?? "1", 10) || 1))

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-3 pb-10 pt-2 sm:px-5 sm:pt-4 lg:px-6 xl:px-8">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_264px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_296px] xl:gap-8">
        <div className="min-w-0">
          <HomeFeedTabs lang={lang} feed={feed} />

          <Suspense key={`${feed}-${page}`} fallback={<FeedSkeleton count={EXPLORE_PAGE_SIZE} />}>
            <HomeResults lang={lang} feed={feed} page={page} />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <HomeSidebarSlot lang={lang} />
        </Suspense>
      </div>
    </div>
  )
}

async function HomeSidebarSlot({ lang }: { lang: Lang }) {
  const trendingTags = await listPopularCreationTags(8)
  return <HomeExploreSidebar lang={lang} trendingTags={trendingTags} />
}

async function HomeResults({ lang, feed, page }: { lang: Lang; feed: FeedKind; page: number }) {
  const t = socialCopy.feed
  const profile = await getCurrentProfile()

  if (feed === "following" && !profile) {
    return (
      <SocialEmptyState
        illustration="peeking"
        title={t.followingGuestTitle[lang]}
        description={t.followingGuestBody[lang]}
        action={
          <Link
            href={loginHref(lang, `${href(lang, "/home")}?feed=following`)}
            className={socialButtonClass({ variant: "solid" })}
          >
            {socialCopy.nav.signIn[lang]}
          </Link>
        }
      />
    )
  }

  const followingIds = feed === "following" && profile ? await listFollowingIds(profile.id) : []
  const result = await listHomeFeed({
    feed,
    page,
    viewerId: profile?.id ?? null,
    followingIds,
    markNewSince: profile?.activity_seen_at ?? null,
  })

  if (result.failed) {
    return (
      <SocialEmptyState
        illustration="confused"
        title={t.loadError[lang]}
        description=""
        action={
          <Link
            href={`${href(lang, "/home")}${feed === "following" ? "?feed=following" : ""}`}
            className={socialButtonClass({ variant: "solid" })}
          >
            {socialCopy.explore.retry[lang]}
          </Link>
        }
      />
    )
  }

  if (result.items.length === 0) {
    const following = feed === "following"
    return (
      <SocialEmptyState
        illustration={following ? "looking" : "sleeping"}
        title={following ? t.followingEmptyTitle[lang] : t.emptyTitle[lang]}
        description={following ? t.followingEmptyBody[lang] : t.emptyBody[lang]}
        action={
          <Link href={href(lang, "/explore")} className={socialButtonClass({ variant: "solid" })}>
            {t.discover[lang]}
          </Link>
        }
      />
    )
  }

  const viewer: FeedViewer | null = profile
    ? {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        avatarConfig: profile.avatar_config,
      }
    : null

  return (
    <HomeFeed
      // New feed/page = fresh client state.
      key={`${feed}|${page}`}
      lang={lang}
      feed={feed}
      viewer={viewer}
      initialItems={result.items}
      initialPage={result.page}
      pageCount={result.pageCount}
    />
  )
}
