import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { Skeleton } from "@/components/social/Skeleton"
import { socialButtonClass } from "@/components/social/socialButton"
import { WorkTile } from "@/components/social/WorkTile"
import { listPublishedCreations } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { homeMemberPath, loginHref } from "@/lib/paths"
import { SITE_NAME } from "@/lib/site"

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
    path: "/",
    title: `${SITE_NAME} — ${copy.tagline[lang]}`,
    description: copy.landingMeta,
    absoluteTitle: true,
  })
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const member = await getCurrentProfile()
  // Guests see the landing; members never paint it (no client flash).
  if (member) redirect(homeMemberPath(lang, member))
  const t = socialCopy.landing

  return (
    <div className="mx-auto max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pt-12 lg:px-16 lg:pt-16">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16">
        <section aria-labelledby="landing-brand" className="min-w-0">
          <p id="landing-brand" className="flex items-center gap-2.5">
            <PxlbMark className="h-7 w-7" />
            <span className="pixel-brand text-[clamp(1.05rem,3.2vw,1.35rem)] tracking-[0.08em]">
              {SITE_NAME}
            </span>
          </p>
          <h1 className="pixel-title mt-5">{copy.tagline[lang]}</h1>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-muted">
            {copy.landingIntro[lang]}
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
            <Link
              href={href(lang, "/register")}
              className={socialButtonClass({ variant: "brand", size: "lg" })}
            >
              {copy.landingJoin[lang]}
            </Link>
            <Link
              href={href(lang, "/explore")}
              className={socialButtonClass({ variant: "soft", size: "lg" })}
            >
              {copy.landingExplore[lang]}
            </Link>
          </div>
          <p className="mt-4 text-[14px] text-muted">
            {t.haveAccount[lang]}{" "}
            <Link
              href={loginHref(lang)}
              className="font-semibold text-fg underline decoration-earth underline-offset-4 hover:text-brick"
            >
              {socialCopy.nav.signIn[lang]}
            </Link>
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            <Link href={href(lang, "/space")} className="underline decoration-earth/60 underline-offset-4 hover:text-fg">
              {copy.landingSpace[lang]}
            </Link>
            <span className="mx-1.5" aria-hidden="true">·</span>
            {copy.landingSpaceNote[lang]}
          </p>
        </section>

        <section aria-labelledby="landing-works-heading" className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="landing-works-heading" className="text-[15px] font-semibold text-fg">
              {t.latestHeading[lang]}
            </h2>
            <Link
              href={href(lang, "/explore")}
              className="shrink-0 text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline"
            >
              {t.seeAll[lang]}
            </Link>
          </div>
          <Suspense fallback={<MosaicSkeleton />}>
            <LandingWorks lang={lang} />
          </Suspense>
        </section>
      </div>
    </div>
  )
}

function MosaicSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="aspect-square" />
      ))}
    </div>
  )
}

async function LandingWorks({ lang }: { lang: Lang }) {
  const result = await listPublishedCreations({ type: "pixel", page: 1 })
  const items = result.items.slice(0, 6)
  const t = socialCopy.landing
  if (result.failed || items.length === 0) {
    return (
      <SocialEmptyState
        title={t.emptyTitle[lang]}
        description={t.emptyBody[lang]}
        action={
          <Link href={href(lang, "/create")} className={socialButtonClass({ variant: "solid" })}>
            {copy.landingCreate[lang]}
          </Link>
        }
      />
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <WorkTile creation={item} lang={lang} />
        </li>
      ))}
    </ul>
  )
}
