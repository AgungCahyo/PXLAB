import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { FollowButton } from "@/components/community/FollowButton"
import { PageTransition } from "@/components/layout/PageTransition"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { Grid2x22 } from "pixelarticons/react"
import { ProfileGridSkeleton } from "@/components/social/Skeleton"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { WorkTile } from "@/components/social/WorkTile"
import { isFollowing } from "@/features/community/follows"
import { listPublishedCreationsByUser } from "@/features/creations/queries"
import { getCurrentProfile, getProfileByUsername } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { formatMonthYear } from "@/lib/format"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"

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
  const bio = profile.bio?.trim()
  return pageMeta({
    lang,
    path: `/u/${profile.username}`,
    title: name,
    description: bio
      ? bio.slice(0, 160)
      : copy.profileMetaBy[lang].replace("{username}", profile.username),
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
      <div className="mx-auto w-full min-w-0 max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <header className="flex min-w-0 items-start gap-4 sm:gap-10">
          <ProfileAvatar
            src={profile.avatar_url}
            avatarConfig={profile.avatar_config}
            userId={profile.id}
            alt={name}
            size="lg"
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <div className="min-w-0">
                <p className="pixel-kicker">@{profile.username}</p>
                <h1 className="page-heading-sans mt-1.5 break-words">{name}</h1>
              </div>
              {!ownProfile ? (
                <FollowButton
                  lang={lang}
                  userId={profile.id}
                  username={profile.username}
                  initialFollowing={following}
                  member={Boolean(me)}
                  returnPath={profilePath}
                />
              ) : null}
            </div>

            <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
              <li>
                <strong className="font-semibold text-fg">{worksCount}</strong>{" "}
                {copy.profileWorksCount[lang].replace("{count}", "").replace(/\s+/g, " ").trim()}
              </li>
              {joined ? (
                <li>
                  {copy.memberSince[lang]} {joined}
                </li>
              ) : null}
            </ul>

            {profile.bio ? (
              <p className="mt-3 max-w-xl whitespace-pre-wrap text-[14px] leading-relaxed text-fg">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </header>

        {ownProfile ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={href(lang, "/settings")} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.nav.settings[lang]}
            </Link>
            <Link href={href(lang, "/dashboard")} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.nav.dashboard[lang]}
            </Link>
            <Link href={href(lang, "/responses")} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {socialCopy.profile.notifications[lang]}
            </Link>
            <Link href={href(lang, "/create")} className={socialButtonClass({ variant: "brand", size: "sm" })}>
              {copy.nav.create[lang]}
            </Link>
          </div>
        ) : null}

        <section className="mt-8 min-w-0 border-t border-[color:var(--soc-hairline)]" aria-labelledby="profile-works-heading">
          <div className="flex justify-center">
            <h2
              id="profile-works-heading"
              className="-mt-px inline-flex min-h-11 items-center gap-2 border-t-2 border-fg px-4 text-[13px] font-semibold text-fg"
            >
              <Grid2x22 width={16} height={16} aria-hidden="true" />
              {socialCopy.profile.tabWorks[lang]}
            </h2>
          </div>

          <div className="mt-3">
            <Suspense fallback={<ProfileGridSkeleton />}>
              <ProfileWorks
                lang={lang}
                username={profile.username}
                items={works.failed ? null : works.items}
                failed={works.failed}
                ownProfile={ownProfile}
              />
            </Suspense>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}

function ProfileWorks({
  lang,
  username,
  items,
  failed,
  ownProfile,
}: {
  lang: Lang
  username: string
  items: Awaited<ReturnType<typeof listPublishedCreationsByUser>>["items"] | null
  failed: boolean
  ownProfile: boolean
}) {
  if (failed || items === null) {
    return (
      <SocialEmptyState
        title={copy.exploreLoadError[lang]}
        description={copy.exploreLoadHint[lang]}
        action={
          <Link href={href(lang, `/u/${username}`)} className={socialButtonClass({ variant: "solid" })}>
            {copy.exploreRetry[lang]}
          </Link>
        }
      />
    )
  }

  if (items.length === 0) {
    return (
      <SocialEmptyState
        title={copy.profileEmptyCreations[lang]}
        description={ownProfile ? copy.profileEmptyOwnBody[lang] : copy.profileEmptyBody[lang]}
        action={
          ownProfile ? (
            <Link href={href(lang, "/create")} className={socialButtonClass({ variant: "brand" })}>
              {copy.nav.create[lang]}
            </Link>
          ) : undefined
        }
      />
    )
  }

  return (
    <ul className="grid min-w-0 grid-cols-3 gap-0.5 sm:gap-1" aria-label={copy.profileWorksHeading[lang]}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <WorkTile creation={item} lang={lang} showAuthor={false} />
        </li>
      ))}
    </ul>
  )
}
