"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon"
import { copy } from "@/lib/copy"
import { href, stripLang, type Lang } from "@/lib/i18n"
import { loginHref, registerHref } from "@/lib/paths"
import { NAV_ITEMS } from "@/lib/site"
import { cn } from "@/lib/utils"

export type NavMember = { username: string; displayName: string | null; isAdmin?: boolean } | null

function useHere() {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const isActive = (path: string) => here === path || here.startsWith(`${path}/`)
  return { pathname, here, isActive }
}

export function SiteNav({ lang, member }: { lang: Lang; member: NavMember }) {
  const { pathname, here, isActive } = useHere()
  const menuId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const other: Lang = lang === "id" ? "en" : "id"
  const authNext =
    here === "/" || here === "/login" || here === "/register" ? undefined : pathname

  useEffect(() => {
    if (!accountOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [accountOpen])

  const langSwitch = (
    <a
      href={href(other, here)}
      hrefLang={other}
      lang={other}
      aria-label={other === "en" ? copy.switchToEn[lang] : copy.switchToId[lang]}
      className="inline-flex h-10 min-w-[4.25rem] items-center justify-center gap-1.5 border-[3px] border-earth bg-card px-3 font-pixel text-[9px] tracking-wider hover:bg-soft"
    >
      <span className={lang === "id" ? "text-fg" : "text-muted"}>ID</span>
      <span aria-hidden="true" className="h-3 w-px bg-line" />
      <span className={lang === "en" ? "text-fg" : "text-muted"}>EN</span>
    </a>
  )

  const itemClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center px-3 text-[14px]",
      active ? "text-fg underline decoration-sky decoration-4 underline-offset-8" : "text-muted hover:text-fg",
    )

  return (
    <div className="flex items-center gap-1">
      <div className="hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={href(lang, item.href)}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
            >
              {copy.nav[item.key][lang]}
            </Link>
          )
        })}
        {member ? (
          <Link
            href={href(lang, `/u/${member.username}`)}
            aria-current={isActive(`/u/${member.username}`) ? "page" : undefined}
            className={itemClass(isActive(`/u/${member.username}`))}
          >
            {copy.nav.profile[lang]}
          </Link>
        ) : (
          <>
            <Link
              href={registerHref(lang, authNext)}
              className={cn(buttonClassName({ size: "sm" }), "ml-3")}
            >
              {copy.nav.join[lang]}
            </Link>
            <Link
              href={loginHref(lang, authNext)}
              className={cn(buttonClassName({ variant: "secondary", size: "sm" }), "ml-1")}
            >
              {copy.nav.signIn[lang]}
            </Link>
          </>
        )}
      </div>
      {member ? (
        <div className="relative ml-1 hidden md:block" ref={menuRef}>
          <button
            type="button"
            aria-expanded={accountOpen}
            aria-controls={menuId}
            onClick={() => setAccountOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-1.5 px-3 text-[14px] text-muted hover:text-fg"
          >
            <PixelIcon name="user" />
            {copy.nav.account[lang]}
          </button>
          {accountOpen ? (
            <div
              id={menuId}
              className="absolute right-0 top-full z-50 mt-1 min-w-44 border-[3px] border-earth bg-card p-2 shadow-[4px_4px_0_0_var(--fg)]"
            >
              <Link
                href={href(lang, "/dashboard")}
                onClick={() => setAccountOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
              >
                <PixelIcon name="folder" />
                {copy.nav.dashboard[lang]}
              </Link>
              <Link
                href={href(lang, "/settings")}
                onClick={() => setAccountOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
              >
                <PixelIcon name="pencil" />
                {copy.nav.settings[lang]}
              </Link>
              {member.isAdmin ? (
                <Link
                  href={href(lang, "/admin")}
                  onClick={() => setAccountOpen(false)}
                  className="flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
                >
                  <PixelIcon name="flag" />
                  {copy.nav.admin[lang]}
                </Link>
              ) : null}
              <LogoutButton lang={lang} className="w-full justify-start" />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="ml-2">{langSwitch}</div>
    </div>
  )
}

export function AppTabBar({ lang, member }: { lang: Lang; member: NavMember }) {
  const { pathname, isActive } = useHere()
  const items: {
    href: string
    label: string
    icon: PixelIconName
    active: boolean
  }[] = [
    {
      href: href(lang, "/explore"),
      label: copy.nav.explore[lang],
      icon: "grid",
      active: isActive("/explore"),
    },
    {
      href: member ? href(lang, "/create") : loginHref(lang, href(lang, "/create")),
      label: copy.nav.create[lang],
      icon: "pencil",
      active: isActive("/create"),
    },
    {
      href: member ? href(lang, `/u/${member.username}`) : loginHref(lang, pathname),
      label: copy.nav.profile[lang],
      icon: "user",
      active: member ? isActive(`/u/${member.username}`) : false,
    },
  ]

  return (
    <nav
      aria-label={copy.navAria[lang]}
      className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-earth bg-bg md:hidden"
    >
      <ul className="grid grid-cols-3">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-[12px]",
                item.active ? "text-fg" : "text-muted",
              )}
            >
              <PixelIcon name={item.icon} className="h-4 w-4" />
              <span
                className={cn(
                  item.active && "underline decoration-sky decoration-4 underline-offset-4",
                )}
              >
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
