import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { CollectionShell } from "@/components/feeds/CollectionShell"
import { getInsightsSummary } from "@/features/feeds/queries"
import { socialCopy } from "@/lib/copy-social"
import { isLang } from "@/lib/i18n"
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
    path: "/insights",
    title: socialCopy.nav.insights[lang],
    description: socialCopy.feeds.insightsDescription[lang],
    noIndex: true,
  })
}

export default async function InsightsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const summary = await getInsightsSummary()
  const t = socialCopy.feeds

  const stats = [
    { label: t.insightWorks[lang], value: summary.works },
    { label: t.insightPublished[lang], value: summary.published },
    { label: t.insightDrafts[lang], value: summary.drafts },
    { label: t.insightArchived[lang], value: summary.archived },
    { label: t.insightAppreciations[lang], value: summary.appreciations },
    { label: t.insightComments[lang], value: summary.comments },
  ]

  return (
    <CollectionShell
      title={t.insightsTitle[lang]}
      description={t.insightsDescription[lang]}
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/80 bg-card p-4 shadow-sm"
          >
            <dt className="text-[12px] font-medium text-muted">{stat.label}</dt>
            <dd className="mt-1 text-[26px] font-semibold tracking-tight text-fg">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </CollectionShell>
  )
}
