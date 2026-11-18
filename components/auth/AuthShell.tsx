import type { ReactNode } from "react"
import Link from "next/link"
import { AuthDoodlePad } from "@/components/auth/AuthDoodlePad"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"

export function AuthShell({
  lang,
  title,
  intro,
  children,
}: {
  lang: Lang
  title: string
  intro: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16 lg:py-16">
      <div className="grid min-w-0 items-start gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,22rem)] lg:justify-between lg:gap-14 xl:grid-cols-[minmax(0,26rem)_minmax(0,24rem)] xl:gap-20">
        <div className="mx-auto w-full min-w-0 max-w-md lg:mx-0">
          <Link
            href={href(lang, "/")}
            aria-label={copy.homeAria[lang]}
            className="inline-flex min-h-11 items-center gap-2.5"
          >
            <PxlbMark className="h-7 w-7" />
            <span className="pixel-brand text-[13px] tracking-[0.08em]">{SITE_NAME}</span>
          </Link>

          <header className="mt-8">
            <h1 className="page-heading-sans text-balance">{title}</h1>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{intro}</p>
          </header>

          <div className="mt-8">{children}</div>
        </div>

        <aside className="hidden min-w-0 lg:sticky lg:top-[5.5rem] lg:block">
          <div className="overflow-hidden border-[3px] border-earth bg-card shadow-[4px_4px_0_0_var(--fg)]">
            <AuthDoodlePad lang={lang} />
          </div>
        </aside>
      </div>
    </div>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-[3px] flex-1 bg-earth/35" />
      <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      <span className="h-[3px] flex-1 bg-earth/35" />
    </div>
  )
}

export function AuthSwitchLink({
  prompt,
  href: to,
  label,
}: {
  prompt?: string
  href: string
  label: string
}) {
  return (
    <p className="text-center text-[14px] text-muted">
      {prompt ? <>{prompt} </> : null}
      <Link
        href={to}
        className="font-medium text-fg underline decoration-earth underline-offset-4 hover:text-brick"
      >
        {label}
      </Link>
    </p>
  )
}
