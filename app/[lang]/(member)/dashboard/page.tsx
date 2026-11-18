import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { WorksRow } from "@/components/creations/WorksRow"
import { PageTransition } from "@/components/layout/PageTransition"
import { BackLink } from "@/components/ui/BackLink"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { PageHeader } from "@/components/ui/PageHeader"
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
        <BackLink href={href(lang, `/u/${profile.username}`)}>{copy.worksBack[lang]}</BackLink>
        <PageHeader
          className="mt-6"
          title={copy.worksTitle[lang]}
          intro={copy.worksIntro[lang]}
          actions={
            <>
              <Link
                href={href(lang, "/responses")}
                className={buttonClassName({ size: "sm", variant: "outline" })}
              >
                {copy.nav.responses[lang]}
              </Link>
              <Link href={href(lang, "/create")} className={buttonClassName({ size: "sm" })}>
                {copy.worksNew[lang]}
              </Link>
            </>
          }
        />

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
      <h2 id={headingId} className="text-[15px] font-medium text-fg">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-5 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {items.map((item) => (
            <WorksRow key={item.id} lang={lang} item={item} primary={primary} />
          ))}
        </ul>
      )}
    </section>
  )
}
