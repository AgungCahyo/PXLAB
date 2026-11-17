import Link from "next/link"
import type { CreationResponseItem } from "@/features/community/activity"
import { displayTitle } from "@/lib/creations"
import { copy } from "@/lib/copy"
import { formatRelativeTime } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function labelFor(item: CreationResponseItem, lang: Lang) {
  const title = displayTitle(item.creationTitle, lang)
  const template =
    item.kind === "comment"
      ? copy.responsesComment[lang]
      : item.kind === "reply"
        ? copy.responsesReply[lang]
        : item.kind === "appreciate"
          ? copy.responsesAppreciate[lang]
          : copy.responsesRemix[lang]
  return template.replace("{user}", `@${item.actorUsername}`).replace("{title}", title)
}

export function ResponsesInbox({
  lang,
  items,
}: {
  lang: Lang
  items: CreationResponseItem[]
}) {
  if (items.length === 0) {
    return <p className="mt-8 text-[15px] text-muted">{copy.responsesEmpty[lang]}</p>
  }

  return (
    <ul className="mt-8 grid gap-2" aria-label={copy.responsesTitle[lang]}>
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={href(lang, `/creation/${item.creationId}`)}
            className={cn(
              "block border-[3px] border-earth px-3 py-3 hover:bg-soft",
              item.unseen ? "bg-soft" : "bg-card",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-fg">
                {labelFor(item, lang)}
              </p>
              {item.unseen ? (
                <span className="shrink-0 border-[2px] border-brick px-1.5 py-0.5 text-[11px] font-medium text-brick">
                  {copy.responsesNew[lang]}
                </span>
              ) : null}
            </div>
            {item.preview ? (
              <p className="mt-1 line-clamp-2 text-[13px] text-muted">{item.preview}</p>
            ) : null}
            <p className="mt-1 text-[12px] text-muted">{formatRelativeTime(item.at, lang)}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
