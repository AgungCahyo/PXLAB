"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "pixelarticons/react"
import { MobileMenuSheet } from "@/components/layout/MobileMenuSheet"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { SiteNav, type NavMember } from "@/components/layout/SiteNav"
import { SocialSidebar, SocialTabBar } from "@/components/layout/SocialNav"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"
import { cn } from "@/lib/utils"

export function SiteHeader({ lang, member }: { lang: Lang; member: NavMember }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

          <div className="flex items-center gap-1">
            <SiteNav lang={lang} member={member} />
            {member ? (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-label={socialCopy.nav.menu[lang]}
                aria-expanded={mobileMenuOpen}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6355d8] md:hidden",
                  mobileMenuOpen && "bg-slate-100 text-[#6355d8]",
                )}
              >
                <Menu width={22} height={22} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </nav>
      </header>

      <MobileMenuSheet
        lang={lang}
        member={member}
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {member ? (
        <header
          className="site-header social-rail fixed inset-y-0 left-0 z-50 hidden w-[72px] border-r border-slate-200/80 bg-card md:block transition-[width] duration-200 ease-out hover:w-[248px] focus-within:w-[248px]"
        >
          <SocialSidebar lang={lang} member={member} />
        </header>
      ) : null}
      <SocialTabBar lang={lang} member={member} />
    </>
  )
}
