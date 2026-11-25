import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PeekingPixelCat, PixelCat, PixelCatDecoration } from "@/components/brand"
import { NewArtworkTrigger } from "@/components/creations/NewArtworkDialog"
import { WorksRow } from "@/components/creations/WorksRow"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { SectionHeader } from "@/components/ui/PageHeader"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { listOwnCreations } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "../../../../lib/copy"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { cn } from "@/lib/utils"
import type { CreationCard } from "@/features/creations/queries"

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

type WorksTab = "all" | "draft" | "published"

function parseTab(value: string | undefined): WorksTab {
  if (value === "draft" || value === "published") return value
  return "all"
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) notFound()

  const sp = await searchParams
  const tab = parseTab(sp.tab)

  const own = await listOwnCreations()
  const drafts = own.filter((item) => item.status !== "published")
  const published = own.filter((item) => item.status === "published")

  const visibleItems: CreationCard[] =
    tab === "draft" ? drafts : tab === "published" ? published : own

  const dashHref = href(lang, "/dashboard")
  const tabItems: { key: WorksTab; label: string; count: number }[] = [
    { key: "all", label: lang === "id" ? "Semua" : "All", count: own.length },
    { key: "draft", label: copy.worksDrafts[lang], count: drafts.length },
    { key: "published", label: copy.worksPublished[lang], count: published.length },
  ]

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-10">
      {/* Screen reader semantic header */}
      <SectionHeader
        id="dashboard-heading"
        title={copy.worksTitle[lang]}
        className="sr-only"
      />

      {/* Main Top Banner Card matching Reference Screenshot */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-6 shadow-sm transition-all sm:p-8">
        {/* Subtle decorative background gradient */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-purple-100/40 via-sky/10 to-transparent blur-2xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-2.5 flex items-center gap-1.5 text-[13px] text-muted">
              <Link
                href={href(lang, `/u/${profile.username}`)}
                className="transition-colors hover:text-fg"
              >
                {copy.worksBack[lang]}
              </Link>
              <span className="text-slate-300" aria-hidden>&gt;</span>
              <span className="font-medium text-fg">{copy.worksTitle[lang]}</span>
            </nav>

            {/* Sparkle + Title */}
            <div className="flex items-center gap-2.5">
              <span className="text-xl sm:text-2xl" role="img" aria-hidden="true">
                ✨
              </span>
              <h1 className="text-[17px] font-semibold leading-snug text-fg sm:text-[26px]">
                {copy.worksTitle[lang]}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              {copy.worksIntro[lang]}
            </p>
          </div>

          {/* Action Buttons + Peeking Cat */}
          <div className="flex flex-col items-end gap-3 self-end sm:self-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={href(lang, "/responses")}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200/90 bg-card px-4 py-2 text-[13px] font-medium text-fg shadow-sm transition-all hover:bg-slate-50 hover:shadow"
              >
                <PixelIcon name="rotate" className="h-4 w-4 text-muted" />
                {copy.nav.responses[lang]}
              </Link>
              <NewArtworkTrigger
                lang={lang}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#1e1435] px-5 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#2e2348] hover:shadow-md"
              >
                <PixelIcon name="plus" className="h-4 w-4" />
                {copy.worksNew[lang]}
              </NewArtworkTrigger>
            </div>
          </div>
        </div>

        {/* Mascot Cat Peeking on the Right matching reference screenshot */}
        <div className="pointer-events-none absolute bottom-0 right-60 hidden md:block lg:right-72">
          <PeekingPixelCat className="h-16 w-28 opacity-95" />
        </div>
      </section>

      {/* Filter Tabs matching Reference Screenshot */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label={lang === "id" ? "Filter karya" : "Filter works"}
          className="flex flex-wrap items-center gap-2"
        >
          {tabItems.map((t) => {
            const active = tab === t.key
            const tabHref = t.key === "all" ? dashHref : `${dashHref}?tab=${t.key}`
            return (
              <Link
                key={t.key}
                href={tabHref}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all shadow-sm",
                  active
                    ? "bg-[#6355d8] text-white shadow-purple-500/20"
                    : "border border-slate-200/70 bg-card text-muted hover:border-slate-300 hover:text-fg",
                )}
              >
                <span>{t.label}</span>
                <span
                  className={cn(
                    "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    active
                      ? "bg-white/25 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {t.count}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Grid of Creations or Empty State */}
      <div className="mt-6">
        {own.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-card p-8">
            <SocialEmptyState
              illustration="drawing"
              title={copy.createEmptyTitle[lang]}
              description={copy.createEmptyBody[lang]}
              action={
                <NewArtworkTrigger
                  lang={lang}
                  className={socialButtonClass({ variant: "solid" })}
                >
                  {copy.worksNew[lang]}
                </NewArtworkTrigger>
              }
            />
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-card py-16 text-center">
            <div className="mb-2" aria-hidden="true">
              <PixelCat
                variant={tab === "draft" ? "drawing" : "celebrating"}
                size="lg"
                animated="float"
                glow
              />
            </div>
            <p className="mt-4 text-[15px] font-semibold text-fg">
              {tab === "draft"
                ? lang === "id"
                  ? "Belum ada draf"
                  : "No drafts yet"
                : lang === "id"
                  ? "Belum ada karya terbit"
                  : "No published works yet"}
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              {tab === "draft"
                ? lang === "id"
                  ? "Draf tersimpan otomatis saat kamu menggambar di kanvas."
                  : "Drafts are saved automatically while drawing."
                : lang === "id"
                  ? "Terbitkan karya drafmu agar tampil di galeri publik."
                  : "Publish your drafts to show them in the gallery."}
            </p>
            <NewArtworkTrigger
              lang={lang}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#6355d8] px-4 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#5245c7]"
            >
              <PixelIcon name="plus" className="h-3.5 w-3.5" />
              {copy.worksNew[lang]}
            </NewArtworkTrigger>
          </div>
        ) : (
          <>
            <ul className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {visibleItems.map((item) => (
                <WorksRow
                  key={item.id}
                  lang={lang}
                  item={item}
                  primary={item.status === "published" ? "view" : "continue"}
                />
              ))}
            </ul>

            {/* Bottom count & pagination bar matching Reference Screenshot */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 pt-5 text-[13px] text-muted">
              <div className="flex items-center gap-2">
                <PixelIcon name="layers" className="h-4 w-4 text-muted" />
                <span>
                  {visibleItems.length}{" "}
                  {lang === "id" ? "karya total" : "works total"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-card text-muted opacity-40"
                  aria-label="Previous page"
                >
                  &lt;
                </button>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#6355d8] text-xs font-semibold text-white shadow-sm">
                  1
                </span>
                <button
                  type="button"
                  disabled
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-card text-muted opacity-40"
                  aria-label="Next page"
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
