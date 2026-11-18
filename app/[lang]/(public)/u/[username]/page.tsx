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
      <div className="mx-auto w-full min-w-0 max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
        <header className="min-w-0">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="shrink-0 self-start border-[3px] border-earth bg-card p-1 shadow-[4px_4px_0_0_var(--fg)]">
              <ProfileAvatar
                src={profile.avatar_url}
                alt={name}
                size="lg"
                className="border-0"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="pixel-kicker">@{profile.username}</p>
              <h1 className="page-heading-sans mt-2 break-words">{name}</h1>

              <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                <li>{copy.profileWorksCount[lang].replace("{count}", String(worksCount))}</li>
                {joined ? (
                  <li>
                    <span className="text-earth" aria-hidden="true">
                      ·
                    </span>{" "}
                    {copy.memberSince[lang]} {joined}
                  </li>
                ) : null}
              </ul>

              {profile.bio ? (
                <p className="mt-4 max-w-2xl whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
                  {profile.bio}
                </p>
              ) : null}

              {ownProfile ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={href(lang, "/dashboard")} className={buttonClassName({ size: "sm" })}>
                    {copy.nav.dashboard[lang]}
                  </Link>
                  <Link
                    href={href(lang, "/create")}
                    className={buttonClassName({ size: "sm", variant: "secondary" })}
                  >
                    {copy.nav.create[lang]}
                  </Link>
                  <Link
                    href={href(lang, "/responses")}
                    className={buttonClassName({ size: "sm", variant: "outline" })}
                  >
                    {copy.nav.responses[lang]}
                  </Link>
                  <Link
                    href={href(lang, "/settings")}
                    className={buttonClassName({ size: "sm", variant: "outline" })}
                  >
                    {copy.nav.settings[lang]}
                  </Link>
                </div>
              ) : (
                <div className="mt-5">
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
          </div>
        </header>

        <section className="mt-10 min-w-0 border-t-[3px] border-earth pt-8" aria-labelledby="profile-works-heading">
          <div className="mb-5 flex min-w-0 flex-wrap items-end justify-between gap-3">
            <h2 id="profile-works-heading" className="text-[15px] font-medium text-fg">
              {copy.profileWorksHeading[lang]}
            </h2>
            <p className="text-[13px] text-muted">
              {copy.profileWorksCount[lang].replace("{count}", String(worksCount))}
            </p>
          </div>

          <Suspense fallback={<GallerySkeleton />}>
            <ProfileWorks
              lang={lang}
              username={profile.username}
              items={works.failed ? null : works.items}
              failed={works.failed}
              ownProfile={ownProfile}
            />
          </Suspense>
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
      <EmptyState
        title={copy.profileEmptyCreations[lang]}
        description={ownProfile ? copy.profileEmptyOwnBody[lang] : copy.profileEmptyBody[lang]}
        action={
          ownProfile ? (
            <Link href={href(lang, "/create")} className={buttonClassName({ size: "sm" })}>
              {copy.nav.create[lang]}
            </Link>
          ) : undefined
        }
      />
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
