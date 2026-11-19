import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { CreationCard } from "@/components/creations/CreationCard"
import { GallerySkeleton } from "@/components/creations/GallerySkeleton"
import { buttonClassName } from "@/components/ui/Button"
import { listPublishedCreations } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { homeMemberPath } from "@/lib/paths"
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

  return (
    <div className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12 lg:px-16">
      <section className="max-w-2xl" aria-labelledby="landing-brand">
        <p id="landing-brand" className="pixel-brand text-[clamp(1.05rem,3.2vw,1.35rem)] tracking-[0.08em]">
          {SITE_NAME}
        </p>
        <h1 className="pixel-title mt-4 max-w-3xl">{copy.tagline[lang]}</h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{copy.landingIntro[lang]}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={href(lang, "/explore")} className={buttonClassName()}>
            {copy.landingExplore[lang]}
          </Link>
          <Link href={href(lang, "/register")} className={buttonClassName({ variant: "secondary" })}>
            {copy.landingJoin[lang]}
          </Link>
        </div>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-muted">
          <Link href={href(lang, "/space")} className="underline decoration-earth underline-offset-4 hover:text-fg">
            {copy.landingSpace[lang]}
          </Link>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          {copy.landingSpaceNote[lang]}
        </p>
      </section>

      <section className="mt-12 sm:mt-14" aria-labelledby="landing-works-heading">
        <div className="mb-4 flex min-w-0 items-end justify-between gap-3">
          <h2 id="landing-works-heading" className="text-[15px] font-medium text-fg">
            {copy.landingWorksHeading[lang]}
          </h2>
          <Link
            href={href(lang, "/explore")}
            className="shrink-0 text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {copy.landingExplore[lang]}
          </Link>
        </div>
        <Suspense fallback={<GallerySkeleton />}>
          <LandingWorks lang={lang} />
        </Suspense>
      </section>
    </div>
  )
}

async function LandingWorks({ lang }: { lang: Lang }) {
  const result = await listPublishedCreations({ type: "pixel", page: 1 })
  const items = result.items.slice(0, 8)
  if (result.failed || items.length === 0) {
    return (
      <p className="text-[15px] text-muted">
        {copy.exploreEmptyAll[lang]}{" "}
        <Link href={href(lang, "/create")} className="underline underline-offset-4 hover:text-fg">
          {copy.landingCreate[lang]}
        </Link>
      </p>
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <CreationCard creation={item} lang={lang} />
        </li>
      ))}
    </ul>
  )
}
