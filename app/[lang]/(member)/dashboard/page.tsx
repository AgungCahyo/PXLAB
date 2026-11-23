import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { WorksRow } from "@/components/creations/WorksRow"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { SectionHeader } from "@/components/ui/PageHeader"
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
    <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <Link
        href={href(lang, `/u/${profile.username}`)}
        className="mb-4 inline-flex min-h-11 items-center text-[13px] text-muted hover:text-fg"
      >
        {copy.worksBack[lang]}
      </Link>

      <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-[17px] font-semibold leading-snug text-fg sm:text-[19px]">
            {copy.worksTitle[lang]}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
            {copy.worksIntro[lang]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={href(lang, "/responses")}
            className={socialButtonClass({ variant: "soft" })}
          >
            {copy.nav.responses[lang]}
          </Link>
          <Link href={href(lang, "/create")} className={socialButtonClass({ variant: "solid" })}>
            {copy.worksNew[lang]}
          </Link>
        </div>
      </div>

      {own.length === 0 ? (
        <div className="mt-6">
          <SocialEmptyState
            title={copy.createEmptyTitle[lang]}
            description={copy.createEmptyBody[lang]}
            action={
              <Link href={href(lang, "/create")} className={socialButtonClass({ variant: "solid" })}>
                {copy.worksNew[lang]}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-8">
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
      <SectionHeader id={headingId} title={title} />
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4">
          {items.map((item) => (
            <WorksRow key={item.id} lang={lang} item={item} primary={primary} />
          ))}
        </ul>
      )}
    </section>
  )
}
