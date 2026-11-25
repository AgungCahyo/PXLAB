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
      <header className="mb-6 max-w-2xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">PXLB</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">{title}</h1>
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
      <div className="rounded-3xl border border-slate-200/80 bg-card p-10 text-center shadow-sm">
        <p className="text-[15px] font-semibold text-fg">{t.emptyTitle[lang]}</p>
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{t.emptyDescription[lang]}</p>
        <Link
          href={href(lang, "/explore")}
          className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-[#6355d8] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
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
