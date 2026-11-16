import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { WorksRow } from "@/components/creations/WorksRow"
import { PageTransition } from "@/components/layout/PageTransition"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { listOwnCreations } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, isLang, type Lang } from "@/lib/i18n"
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
    path: "/dashboard",
    title: copy.worksTitle,
    description: copy.worksMeta,
    noIndex: true,
  })
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) notFound()
  const own = await listOwnCreations()
  const drafts = own.filter((item) => item.status !== "published")
  const published = own.filter((item) => item.status === "published")

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16">
        <Link
          href={href(lang, `/u/${profile.username}`)}
          className="inline-flex h-11 w-fit items-center gap-2 border-[3px] border-earth bg-card px-3 text-[14px] font-medium"
        >
          <PixelIcon name="back" />
          {copy.worksBack[lang]}
        </Link>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="pixel-title">{copy.worksTitle[lang]}</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{copy.worksIntro[lang]}</p>
          </div>
          <Link href={href(lang, "/create")} className={buttonClassName({ size: "sm" })}>
            {copy.worksNew[lang]}
          </Link>
        </div>

        {own.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title={copy.createEmptyTitle[lang]}
              description={copy.createEmptyBody[lang]}
              action={
                <Link href={href(lang, "/create")} className={buttonClassName({ size: "sm" })}>
                  {copy.worksNew[lang]}
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-12">
            <WorksGroup
              lang={lang}
              headingId="works-drafts"
              title={copy.worksDrafts[lang]}
              empty={copy.worksEmptyDrafts[lang]}
              items={drafts}
              primary="continue"
            />
            <WorksGroup
              lang={lang}
              headingId="works-published"
              title={copy.worksPublished[lang]}
              empty={copy.worksEmptyPublished[lang]}
              items={published}
              primary="view"
            />
          </div>
        )}
      </div>
    </PageTransition>
  )
}

function WorksGroup({
  lang,
  headingId,
  title,
  empty,
  items,
  primary,
}: {
  lang: Lang
  headingId: string
  title: string
  empty: string
  items: Awaited<ReturnType<typeof listOwnCreations>>
  primary: "continue" | "view"
}) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="pixel-title">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {items.map((item) => (
            <WorksRow key={item.id} lang={lang} item={item} primary={primary} />
          ))}
        </ul>
      )}
    </section>
  )
}
