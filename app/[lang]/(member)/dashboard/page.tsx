import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PixelArt } from "@/components/creations/PixelArt"
import { WorksDeleteButton } from "@/components/creations/WorksDeleteButton"
import { EmptyState } from "@/components/ui/EmptyState"
import { buttonClassName } from "@/components/ui/Button"
import { listOwnCreations } from "@/features/creations/queries"
import { displayTitle } from "@/lib/creations"
import { copy, creationTypeLabels } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { pixelCoverUrl } from "@/lib/site"

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
  const own = await listOwnCreations()
  const drafts = own.filter((item) => item.status !== "published")
  const published = own.filter((item) => item.status === "published")

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
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
          {items.map((item) => {
            const cover =
              item.type === "pixel" ? item.cover_url || pixelCoverUrl(item.id) : null
            const statusLabel =
              item.status === "published"
                ? copy.createPublishedBadge[lang]
                : item.status === "hidden"
                  ? copy.createHiddenBadge[lang]
                  : copy.createDraftBadge[lang]
            return (
              <li key={item.id}>
                <div className="pixel-frame flex min-h-16 items-center gap-4 bg-card">
                  {cover ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden border-r-[3px] border-earth bg-bg">
                      <PixelArt src={cover} alt="" variant="thumb" framed={false} />
                    </div>
                  ) : (
                    <div className="h-20 w-20 shrink-0 border-r-[3px] border-earth bg-soft" aria-hidden />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-4 sm:px-4">
                    <p className="truncate font-medium">{displayTitle(item.title, lang)}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {creationTypeLabels[item.type][lang]} · {statusLabel}
                      {` · ${formatDayMonthYear(item.updated_at, lang)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:px-5">
                    {primary === "view" ? (
                      <>
                        <Link
                          href={href(lang, `/creation/${item.id}`)}
                          className={buttonClassName({ size: "sm", variant: "secondary" })}
                        >
                          {copy.worksView[lang]}
                        </Link>
                        <Link
                          href={href(lang, `/create/${item.id}`)}
                          className={buttonClassName({ size: "sm", variant: "outline" })}
                        >
                          {copy.createEdit[lang]}
                        </Link>
                      </>
                    ) : (
                      <Link
                        href={href(lang, `/create/${item.id}`)}
                        className={buttonClassName({ size: "sm" })}
                      >
                        {copy.worksContinue[lang]}
                      </Link>
                    )}
                    <WorksDeleteButton lang={lang} creationId={item.id} />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
