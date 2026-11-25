import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Comment, Heart, Pencil, UserPlus } from "pixelarticons/react"

import { CollectionShell } from "@/components/feeds/CollectionShell"
import { listOwnActivity, type ActivityKind } from "@/features/feeds/queries"
import { socialCopy } from "@/lib/copy-social"
import { formatDayMonthYear } from "@/lib/format"
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
    path: "/activity",
    title: socialCopy.nav.activity[lang],
    description: socialCopy.feeds.activityDescription[lang],
    noIndex: true,
  })
}

function kindIcon(kind: ActivityKind) {
  if (kind === "appreciate") return <Heart width={18} height={18} aria-hidden="true" />
  if (kind === "comment") return <Comment width={18} height={18} aria-hidden="true" />
  if (kind === "follow") return <UserPlus width={18} height={18} aria-hidden="true" />
  return <Pencil width={18} height={18} aria-hidden="true" />
}

function kindLabel(kind: ActivityKind, lang: Lang) {
  const t = socialCopy.feeds
  if (kind === "appreciate") return t.activityAppreciate[lang]
  if (kind === "comment") return t.activityComment[lang]
  if (kind === "follow") return t.activityFollow[lang]
  return t.activityPublish[lang]
}

export default async function ActivityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const items = await listOwnActivity()
  const t = socialCopy.feeds

  return (
    <CollectionShell
      title={t.activityTitle[lang]}
      description={t.activityDescription[lang]}
    >
      {items.length ? (
        <ol className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={href(lang, item.path)}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-slate-200/80 bg-card p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-[#6355d8]">
                  {kindIcon(item.kind)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-muted">
                    {kindLabel(item.kind, lang)}
                  </span>
                  <span className="block truncate text-[14px] font-semibold text-fg">
                    {item.title}
                  </span>
                  {item.preview ? (
                    <span className="block truncate text-[12px] text-muted">{item.preview}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-[12px] text-muted">
                  {formatDayMonthYear(item.at, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-card p-10 text-center">
          <p className="text-[15px] font-semibold text-fg">{t.emptyTitle[lang]}</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{t.emptyDescription[lang]}</p>
        </div>
      )}
    </CollectionShell>
  )
}
