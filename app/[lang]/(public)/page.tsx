import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { CreationCard } from "@/components/creations/CreationCard"
import { GallerySkeleton } from "@/components/creations/GallerySkeleton"
import { Card, CardDescription, CardTitle } from "@/components/ui/Card"
import { buttonClassName } from "@/components/ui/Button"
import { listPublishedCreations } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
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
    description: copy.description,
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

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-16">
      <p className="pixel-kicker mb-4">{SITE_NAME}</p>
      <h1 className="pixel-title max-w-3xl">{copy.tagline[lang]}</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{copy.landingIntro[lang]}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href={href(lang, "/explore")} className={buttonClassName()}>
          {copy.landingExplore[lang]}
        </Link>
        {member ? (
          <Link href={href(lang, "/create")} className={buttonClassName({ variant: "secondary" })}>
            {copy.landingCreate[lang]}
          </Link>
        ) : (
          <Link href={href(lang, "/register")} className={buttonClassName({ variant: "secondary" })}>
            {copy.landingJoin[lang]}
          </Link>
        )}
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

      <div className="mt-10">
        <Suspense fallback={<GallerySkeleton />}>
          <LandingWorks lang={lang} />
        </Suspense>
      </div>

      <section className="mt-12 grid gap-4 md:grid-cols-2" aria-labelledby="modes-heading">
        <h2 id="modes-heading" className="sr-only">
          {copy.modesHeading[lang]}
        </h2>
        <Card>
          <p className="pixel-kicker">{copy.mode1[lang]}</p>
          <CardTitle className="mt-2">{copy.personalTitle[lang]}</CardTitle>
          <CardDescription>{copy.personalBody[lang]}</CardDescription>
        </Card>
        <Card>
          <p className="pixel-kicker">{copy.mode2[lang]}</p>
          <CardTitle className="mt-2">{copy.collectiveTitle[lang]}</CardTitle>
          <CardDescription>{copy.collectiveBody[lang]}</CardDescription>
        </Card>
      </section>
    </div>
  )
}

async function LandingWorks({ lang }: { lang: Lang }) {
  const result = await listPublishedCreations({ type: "pixel", page: 1 })
  const items = result.items.slice(0, 6)
  if (result.failed || items.length === 0) return null
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <CreationCard creation={item} lang={lang} />
        </li>
      ))}
    </ul>
  )
}
