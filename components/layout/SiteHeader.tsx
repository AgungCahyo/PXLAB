"use client"

import Link from "next/link"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { SiteNav, type NavMember } from "@/components/layout/SiteNav"
import { SocialSidebar, SocialTabBar } from "@/components/layout/SocialNav"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader({ lang, member }: { lang: Lang; member: NavMember }) {
  return (
    <>
      <header
        className={cn(
          "site-header fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-card/95 backdrop-blur-md transition-colors",
          member && "md:hidden",
        )}
      >
        <div className="h-1 bg-gradient-to-r from-purple-500 via-sky to-grass" aria-hidden="true" />
        <nav
          aria-label={copy.navAria[lang]}
          className="relative mx-auto flex h-[60px] max-w-7xl items-center justify-between px-4 sm:px-8 lg:px-16"
        >
          <Link
            href={href(lang, "/")}
            aria-label={copy.homeAria[lang]}
            className="flex min-h-11 items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <PxlbMark className="h-6 w-6" />
            <span className="pixel-brand text-[15px] font-bold text-fg">{SITE_NAME}</span>
          </Link>
          <SiteNav lang={lang} member={member} />
        </nav>
      </header>
      {member ? (
        <header
          className="site-header social-rail fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-slate-200/80 bg-card md:block shadow-[1px_0_0_0_rgba(0,0,0,0.02)]"
        >
          <SocialSidebar lang={lang} member={member} />
        </header>
      ) : null}
      <SocialTabBar lang={lang} member={member} />
    </>
  )
}
