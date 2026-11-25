import Link from "next/link"
import { Bell, Comment, GitBranch, MessageReply } from "pixelarticons/react"
import { PixelCatEmptyState } from "@/components/brand/PixelCatDecoration"
import { PixelHeart } from "@/components/social/PixelHeart"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import type { CreationResponseItem } from "@/features/community/activity"
import { displayTitle } from "@/lib/creations"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { formatRelativeTime } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { groupByRecency, splitTemplate, type RecencyGroup } from "@/lib/response-groups"
import { cn } from "@/lib/utils"

function templateFor(item: CreationResponseItem, lang: Lang) {
  return item.kind === "comment"
    ? copy.responsesComment[lang]
    : item.kind === "reply"
      ? copy.responsesReply[lang]
      : item.kind === "appreciate"
        ? copy.responsesAppreciate[lang]
        : copy.responsesRemix[lang]
}

function KindIcon({ kind }: { kind: CreationResponseItem["kind"] }) {
  if (kind === "appreciate") return <PixelHeart filled size={18} />
  if (kind === "reply") return <MessageReply width={20} height={20} aria-hidden="true" />
  if (kind === "remix") return <GitBranch width={20} height={20} aria-hidden="true" />
  return <Comment width={20} height={20} aria-hidden="true" />
}

function kindTone(kind: CreationResponseItem["kind"]) {
  if (kind === "appreciate") return "bg-rose-50 text-rose-500"
  if (kind === "reply") return "bg-sky-50 text-sky-600"
  if (kind === "remix") return "bg-emerald-50 text-emerald-600"
  return "bg-purple-50 text-[#6355d8]"
}

function Message({ item, lang }: { item: CreationResponseItem; lang: Lang }) {
  const title = displayTitle(item.creationTitle, lang)
  return (
    <p className="text-[14px] leading-snug text-fg">
      {splitTemplate(templateFor(item, lang)).map((part, index) =>
        part.type === "user" ? (
          <strong key={index} className="font-semibold">
            @{item.actorUsername}
          </strong>
        ) : part.type === "title" ? (
          <strong key={index} className="font-semibold">
            {title}
          </strong>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  )
}

const GROUP_LABEL: Record<RecencyGroup, "groupToday" | "groupWeek" | "groupEarlier"> = {
  today: "groupToday",
  week: "groupWeek",
  earlier: "groupEarlier",
}

export function ResponsesInbox({
  lang,
  items,
}: {
  lang: Lang
  items: CreationResponseItem[]
}) {
  const t = socialCopy.notifications

  if (items.length === 0) {
    return (
      <SocialEmptyState
        className="mt-6 rounded-3xl border border-slate-200/80 bg-card py-12 shadow-sm"
        illustration="sleeping"
        title={t.emptyTitle[lang]}
        description={t.emptyBody[lang]}
        action={
          <Link href={href(lang, "/explore")} className={socialButtonClass({ variant: "solid" })}>
            {socialCopy.nav.explore[lang]}
          </Link>
        }
      />
    )
  }

  return (
    <div className="mt-5 grid gap-6" aria-label={t.title[lang]}>
      {groupByRecency(items).map(({ group, items: groupItems }) => (
        <section key={group} aria-labelledby={`notif-${group}`}>
          <h2
            id={`notif-${group}`}
            className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {t[GROUP_LABEL[group]][lang]}
          </h2>
          <ul className="overflow-hidden rounded-2xl border border-slate-200/80 bg-card shadow-sm">
            {groupItems.map((item, index) => (
              <li key={item.id} className={index > 0 ? "border-t border-slate-100" : undefined}>
                <Link
                  href={href(lang, `/creation/${item.creationId}`)}
                  className={cn(
                    "group flex min-h-14 items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80",
                    item.unseen && "bg-purple-50/25",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                      kindTone(item.kind),
                    )}
                  >
                    <KindIcon kind={item.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Message item={item} lang={lang} />
                    {item.preview ? (
                      <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-muted">
                        {item.preview}
                      </span>
                    ) : null}
                    <span className="mt-1.5 block text-[12px] text-muted">
                      {formatRelativeTime(item.at, lang)}
                    </span>
                  </span>
                  {item.unseen ? (
                    <span
                      className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#6355d8]"
                      role="img"
                      aria-label={t.newAria[lang]}
                    />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
