import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { FollowButton } from "@/components/community/FollowButton"
import { CreationCard } from "@/components/creations/CreationCard"
import { GallerySkeleton } from "@/components/creations/GallerySkeleton"
import { PageTransition } from "@/components/layout/PageTransition"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { isFollowing } from "@/features/community/follows"
import { listPublishedCreationsByUser } from "@/features/creations/queries"
import { getCurrentProfile, getProfileByUsername } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { formatMonthYear } from "@/lib/format"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { SITE_NAME } from "@/lib/site"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; username: string }>
}): Promise<Metadata> {
  const { lang, username } = await params
  if (!isLang(lang)) return {}
  const profile = await getProfileByUsername(username)
  if (!profile) {
    return pageMeta({
      lang,
      path: `/u/${username}`,
      title: copy.profileTitle,
      description: copy.profileNotFound,
    })
  }
  const name = profile.display_name ?? profile.username
  return pageMeta({
    lang,
    path: `/u/${profile.username}`,
    title: name,
    description: profile.bio || `${name} — ${SITE_NAME}`,
  })
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ lang: string; username: string }>
}) {
  const { lang: raw, username } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const name = profile.display_name?.trim() || profile.username
  const me = await getCurrentProfile()
  const ownProfile = me?.id === profile.id
  const works = await listPublishedCreationsByUser(profile.id, { type: "pixel", limit: 100 })
  const worksCount = works.failed ? 0 : works.items.length
  const joined = formatMonthYear(profile.created_at, lang)
  const following =
    me && !ownProfile ? await isFollowing(me.id, profile.id) : false
  const profilePath = href(lang, `/u/${profile.username}`)

  return (
    <PageTransition>
      <div className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
        <header className="flex min-w-0 items-start gap-4">
          <ProfileAvatar src={profile.avatar_url} alt={name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-snug text-muted">@{profile.username}</p>
            <h1 className="pixel-title mt-1 break-words">{name}</h1>
            <p className="mt-2 text-[13px] leading-snug text-muted">
              {copy.profileWorksCount[lang].replace("{count}", String(worksCount))}
              {joined ? ` · ${copy.memberSince[lang]} ${joined}` : ""}
            </p>
            {profile.bio ? (
              <p className="mt-2 max-w-xl whitespace-pre-wrap text-[15px] leading-relaxed text-muted">
                {profile.bio}
              </p>
            ) : null}
            {ownProfile ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={href(lang, "/dashboard")} className={buttonClassName({ size: "sm" })}>
                  {copy.nav.dashboard[lang]}
                </Link>
                <Link
                  href={href(lang, "/responses")}
                  className={buttonClassName({ size: "sm", variant: "outline" })}
                >
                  {copy.nav.responses[lang]}
                </Link>
                <Link
                  href={href(lang, "/settings")}
                  className={buttonClassName({ variant: "outline", size: "sm" })}
                >
                  {copy.nav.settings[lang]}
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <FollowButton
                  lang={lang}
                  userId={profile.id}
                  username={profile.username}
                  initialFollowing={following}
                  member={Boolean(me)}
                  returnPath={profilePath}
                />
              </div>
            )}
          </div>
        </header>

        <div className="mt-8 min-w-0">
          <Suspense fallback={<GallerySkeleton />}>
            <ProfileWorks
              lang={lang}
              username={profile.username}
              items={works.failed ? null : works.items}
              failed={works.failed}
            />
          </Suspense>
        </div>
      </div>
    </PageTransition>
  )
}

function ProfileWorks({
  lang,
  username,
  items,
  failed,
}: {
  lang: Lang
  username: string
  items: Awaited<ReturnType<typeof listPublishedCreationsByUser>>["items"] | null
  failed: boolean
}) {
  if (failed || items === null) {
    return (
      <EmptyState
        title={copy.exploreLoadError[lang]}
        description={copy.exploreLoadHint[lang]}
        action={
          <Link href={href(lang, `/u/${username}`)} className={buttonClassName({ size: "sm" })}>
            {copy.exploreRetry[lang]}
          </Link>
        }
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState title={copy.profileEmptyCreations[lang]} description={copy.profileEmptyBody[lang]} />
    )
  }

  return (
    <ul
      className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-label={copy.profileWorksHeading[lang]}
    >
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <CreationCard creation={item} lang={lang} showAuthor={false} />
        </li>
      ))}
    </ul>
  )
}
