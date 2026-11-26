import Link from "next/link"
import type { ReactNode } from "react"

import { CreationCard } from "@/components/creations/CreationCard"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CollectionShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <header className="mb-6 max-w-2xl border-b border-line pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">PXLB</p>
        <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">{title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
      </header>
      {children}
    </div>
  )
}

export function FeedGrid({ lang, items }: { lang: Lang; items: CreationCardData[] }) {
  const t = socialCopy.feeds
  if (!items.length) {
    return (
      <div className="rounded-none border border-line bg-card p-10 text-center">
        <p className="text-[15px] font-semibold text-fg">{t.emptyTitle[lang]}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{t.emptyDescription[lang]}</p>
        <Link
          href={href(lang, "/explore")}
          className="mt-4 inline-flex min-h-10 items-center rounded-[2px] bg-[#ff4f00] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#e04400]"
        >
          {socialCopy.nav.explore[lang]}
        </Link>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          <CreationCard creation={item} lang={lang} />
        </li>
      ))}
    </ul>
  )
}
