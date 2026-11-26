import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CreatorCardList } from "@/components/creations/CreatorCardList"
import { BackLink } from "@/components/ui/BackLink"
import { PageHeader } from "@/components/ui/PageHeader"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { listFollowingIds } from "@/features/community/follows"
import { listCreatorWorkPreviews, listNewCreators } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "../../../../lib/copy"
import { href, isLang } from "@/lib/i18n"
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
    path: "/creators",
    title: copy.newCreatorsTitle,
    description: copy.newCreatorsMeta,
  })
}

export default async function CreatorsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw

  const viewer = await getCurrentProfile()
  const currentUserId = viewer?.id ?? null
  const following = viewer ? await listFollowingIds(viewer.id) : []
  const result = await listNewCreators(36, currentUserId)
  const previews = await listCreatorWorkPreviews(result.items.map((creator) => creator.id))
  const returnPath = href(lang, "/creators")
  const member = Boolean(viewer)

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <BackLink href={href(lang, "/explore")} className="mb-5">
        {copy.exploreTitle[lang]}
      </BackLink>
      <div className="relative border-b border-line pb-6">
        <div className="pointer-events-none absolute right-3 top-0 hidden opacity-90 sm:block" aria-hidden="true">
          <img src="/pixel-cats/celebrating.svg" alt="" width={96} height={96} className="select-none [image-rendering:pixelated]" />
        </div>
        <div className="relative z-[1] max-w-2xl pr-0 sm:pr-24">
          <PageHeader title={copy.newCreatorsTitle[lang]} intro={copy.newCreatorsIntro[lang]} />
        </div>
      </div>

      {result.failed ? (
        <SocialEmptyState
          className="mt-6 px-4 py-8 sm:py-10 rounded-none border border-dashed border-line bg-soft"
          illustration="confused"
          title={copy.exploreLoadError[lang]}
          description={copy.exploreLoadHint[lang]}
          action={
            <Link href={returnPath} className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.exploreRetry[lang]}
            </Link>
          }
        />
      ) : result.items.length === 0 ? (
        <SocialEmptyState
          className="mt-6 px-4 py-8 sm:py-10 rounded-none border border-dashed border-line bg-soft"
          illustration="peeking"
          title={copy.newCreatorsTitle[lang]}
          description={copy.newCreatorsEmpty[lang]}
        />
      ) : (
        <div className="mt-6 min-w-0">
          <CreatorCardList
            lang={lang}
            items={result.items}
            previews={previews}
            followingIds={new Set(following)}
            member={member}
            returnPath={returnPath}
            currentUserId={currentUserId}
            layout="grid"
            label={copy.newCreatorsTitle[lang]}
          />
        </div>
      )}
    </div>
  )
}
