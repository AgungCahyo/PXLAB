"use client"

import Link from "next/link"
import { CommonsMark } from "@/components/layout/CommonsMark"
import { AppTabBar, SiteNav, type NavMember } from "@/components/layout/SiteNav"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"

export function SiteHeader({ lang, member }: { lang: Lang; member: NavMember }) {
  return (
    <>
      <header
        className="site-header fixed inset-x-0 top-0 z-50 border-b-[3px] border-earth bg-bg"
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="h-1.5 bg-sky" aria-hidden="true" />
        <nav
          aria-label={copy.navAria[lang]}
          className="relative mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-16"
        >
          <Link
            href={href(lang, "/")}
            aria-label={copy.homeAria[lang]}
            className="flex min-h-11 items-center gap-2.5"
          >
            <CommonsMark />
            <span className="pixel-brand">{SITE_NAME}</span>
          </Link>
          <SiteNav lang={lang} member={member} />
        </nav>
      </header>
      <AppTabBar lang={lang} member={member} />
    </>
  )
}
