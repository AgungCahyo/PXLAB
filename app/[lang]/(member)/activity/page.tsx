import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Comment, GitBranch, MessageReply } from "pixelarticons/react"

import { CollectionShell } from "@/components/feeds/CollectionShell"
import { PixelHeart } from "@/components/social/PixelHeart"
import { listActivityResponses, type ActivityResponseKind } from "@/features/community/activity"
import { displayTitle } from "@/lib/creations"
import { copy } from "../../../../lib/copy"
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
    description: copy.responsesMeta[lang],
    noIndex: true,
  })
}

function kindIcon(kind: ActivityResponseKind) {
  if (kind === "appreciate") return <PixelHeart filled size={18} />
  if (kind === "reply") return <MessageReply width={18} height={18} aria-hidden="true" />
  if (kind === "remix") return <GitBranch width={18} height={18} aria-hidden="true" />
  return <Comment width={18} height={18} aria-hidden="true" />
}

function kindLabel(kind: ActivityResponseKind, lang: Lang) {
  if (kind === "comment") return lang === "id" ? "Menulis catatan" : "Left a note"
  if (kind === "reply") return lang === "id" ? "Membalas catatan" : "Replied to a note"
  if (kind === "appreciate") return lang === "id" ? "Mengapresiasi karya" : "Appreciated a work"
  return lang === "id" ? "Me-remix karya" : "Remixed a work"
}

function templateFor(item: { kind: ActivityResponseKind }, lang: Lang) {
  return item.kind === "comment"
    ? copy.responsesComment[lang]
    : item.kind === "reply"
      ? copy.responsesReply[lang]
      : item.kind === "appreciate"
        ? copy.responsesAppreciate[lang]
        : copy.responsesRemix[lang]
}

function splitTemplate(template: string) {
  return template
    .split(/(\{user\}|\{title\})/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part === "{user}"
        ? { type: "user" as const, value: part }
        : part === "{title}"
          ? { type: "title" as const, value: part }
          : { type: "text" as const, value: part },
    )
}

export default async function ActivityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const items = await listActivityResponses({ markSeen: true })
  const t = socialCopy.notifications

  return (
    <CollectionShell
      title={socialCopy.nav.activity[lang]}
      description={copy.responsesMeta[lang]}
    >
      {items.length ? (
        <ol className="space-y-2">
          {items.map((item) => {
            const title = displayTitle(item.creationTitle, lang)
            return (
              <li key={item.id}>
                <Link
                  href={href(lang, `/creation/${item.creationId}`)}
                  className="flex min-h-16 items-center gap-3 rounded-none border border-line bg-card p-3 transition-colors hover:border-fg/30 hover:bg-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line bg-soft text-fg">
                    {kindIcon(item.kind)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-muted">
                      {kindLabel(item.kind, lang)}
                    </span>
                    <span className="block truncate text-[14px] font-semibold text-fg">
                      {splitTemplate(templateFor(item, lang)).map((part, index) =>
                        part.type === "user" ? (
                          <span key={index}>@{item.actorUsername}</span>
                        ) : part.type === "title" ? (
                          <span key={index}>{title}</span>
                        ) : (
                          <span key={index}>{part.value}</span>
                        ),
                      )}
                    </span>
                    {item.preview ? (
                      <span className="block truncate text-[12px] text-muted">{item.preview}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[12px] text-muted">
                    {item.unseen ? (
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-[#6355d8]"
                        role="img"
                        aria-label={t.newAria[lang]}
                      />
                    ) : null}
                    {formatDayMonthYear(item.at, lang)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-card p-10 text-center">
          <p className="text-[15px] font-semibold text-fg">{t.emptyTitle[lang]}</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{t.emptyBody[lang]}</p>
        </div>
      )}
    </CollectionShell>
  )
}
