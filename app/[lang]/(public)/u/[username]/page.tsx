import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CreationCard } from "@/components/creations/CreationCard"
import { GallerySkeleton } from "@/components/creations/GallerySkeleton"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { listPublishedCreationsByUser } from "@/features/creations/queries"
import { getCurrentProfile, getProfileByUsername } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
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

  const name = profile.display_name ?? profile.username
  const me = await getCurrentProfile()
  const ownProfile = me?.id === profile.id

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16">
      <p className="text-[15px] text-muted">@{profile.username}</p>
      <h1 className="pixel-title mt-2">{name}</h1>
      {profile.bio ? (
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{profile.bio}</p>
      ) : null}
      {ownProfile ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={href(lang, "/dashboard")} className={buttonClassName({ size: "sm" })}>
            <PixelIcon name="folder" />
            {copy.nav.dashboard[lang]}
          </Link>
          <Link href={href(lang, "/settings")} className={buttonClassName({ variant: "outline", size: "sm" })}>
            <PixelIcon name="pencil" />
            {copy.nav.settings[lang]}
          </Link>
          <LogoutButton lang={lang} />
        </div>
      ) : null}
      <div className="mt-8">
        <Suspense fallback={<GallerySkeleton />}>
          <ProfileWorks lang={lang} userId={profile.id} username={profile.username} />
        </Suspense>
      </div>
    </div>
  )
}

async function ProfileWorks({
  lang,
  userId,
  username,
}: {
  lang: Lang
  userId: string
  username: string
}) {
  const result = await listPublishedCreationsByUser(userId)
  if (result.failed) {
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
  if (result.items.length === 0) {
    return (
      <EmptyState title={copy.profileEmptyCreations[lang]} description={copy.profileEmptyBody[lang]} />
    )
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {result.items.map((item) => (
        <li key={item.id}>
          <CreationCard creation={item} lang={lang} />
        </li>
      ))}
    </ul>
  )
}
