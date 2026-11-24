"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import { href, stripLang, type Lang } from "@/lib/i18n"
import { loginHref, registerHref } from "@/lib/paths"
import { NAV_ITEMS } from "@/lib/site"
import { cn } from "@/lib/utils"

export type NavMember = {
  id?: string | null
  username: string | null
  displayName: string | null
  avatarUrl?: string | null
  avatarConfig?: import("@/lib/avatar-gen").AvatarConfig | null
  isAdmin?: boolean
  hasResponses?: boolean
} | null

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

  const itemClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center px-3 text-[14px] font-medium leading-snug",
      active ? "text-fg underline decoration-sky decoration-4 underline-offset-8" : "text-muted hover:text-fg",
    )

  const profilePath = member ? `/u/${member.username}` : null
  const accountActive =
    Boolean(member) &&
    (isActive("/dashboard") ||
      isActive("/responses") ||
      isActive("/settings") ||
      isActive("/admin") ||
      (profilePath ? isActive(profilePath) : false))

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
        {!member ? (
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
        ) : null}
      </div>
      {/* One guest CTA on small screens — Join covers convert; sign-in lives on that page. */}
      {!member ? (
        <Link
          href={registerHref(lang, authNext)}
          className={cn(buttonClassName({ size: "sm" }), "md:hidden")}
        >
          {copy.nav.join[lang]}
        </Link>
      ) : null}
      {member ? (
        <div className="relative ml-1" ref={menuRef}>
          <button
            type="button"
            aria-expanded={accountOpen}
            aria-controls={menuId}
            aria-label={copy.nav.account[lang]}
            onClick={() => setAccountOpen((open) => !open)}
            className={cn(
              "relative inline-flex min-h-11 items-center gap-2 px-2 text-[14px] hover:text-fg",
              accountActive ? "text-fg" : "text-muted",
            )}
          >
            <ProfileAvatar
              src={member.avatarUrl}
              avatarConfig={member.avatarConfig}
              userId={member.id}
              alt={member.displayName ?? member.username ?? "PXLB"}
              size="xs"
              className="border-earth"
            />
            <span className="hidden max-w-[8rem] truncate md:inline">
              {member.username ? `@${member.username}` : copy.nav.account[lang]}
            </span>
            {member.hasResponses ? (
              <span
                className="absolute right-1 top-2 h-2 w-2 bg-brick"
                aria-label={copy.responsesNavDot[lang]}
              />
            ) : null}
          </button>
          {accountOpen ? (
            <div
              id={menuId}
              className="absolute right-0 top-full z-50 mt-1 min-w-48 border-[3px] border-earth bg-card p-2 shadow-[4px_4px_0_0_var(--fg)]"
            >
              <Link
                href={href(lang, member.username ? `/u/${member.username}` : "/welcome")}
                onClick={() => setAccountOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
              >
                <PixelIcon name="user" />
                {copy.nav.profile[lang]}
              </Link>
              <Link
                href={href(lang, "/dashboard")}
                onClick={() => setAccountOpen(false)}
                className="flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
              >
                <PixelIcon name="folder" />
                {copy.nav.dashboard[lang]}
              </Link>
              <Link
                href={href(lang, "/responses")}
                onClick={() => setAccountOpen(false)}
                className="relative flex min-h-11 items-center gap-2 px-3 text-[14px] text-muted hover:bg-soft hover:text-fg"
              >
                <PixelIcon name="heart" />
                {copy.nav.responses[lang]}
                {member.hasResponses ? (
                  <span className="ml-auto h-2 w-2 bg-brick" aria-hidden />
                ) : null}
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
            </div>
          ) : null}
        </div>
      ) : null}
      {/* Members change language in Settings; guests keep the header switch. */}
      {!member ? (
        <div className="ml-2">
          <LanguageSwitch lang={lang} className="h-10" />
        </div>
      ) : null}
    </div>
  )
}

export function AppTabBar({ lang, member }: { lang: Lang; member: NavMember }) {
  const { pathname, isActive } = useHere()
  const items: {
    key: string
    href: string
    label: string
    icon: PixelIconName
    active: boolean
    avatar?: boolean
    badge?: boolean
  }[] = [
    {
      key: "explore",
      href: href(lang, "/explore"),
      label: copy.nav.explore[lang],
      icon: "grid",
      active: isActive("/explore"),
    },
    {
      key: "create",
      href: member ? href(lang, "/create") : loginHref(lang, href(lang, "/create")),
      label: copy.nav.create[lang],
      icon: "pencil",
      active: isActive("/create"),
    },
  ]

  if (member) {
    items.push({
      key: "works",
      href: href(lang, "/dashboard"),
      label: copy.nav.dashboard[lang],
      icon: "folder",
      active: isActive("/dashboard") || isActive("/responses"),
      badge: Boolean(member.hasResponses),
    })
    items.push({
      key: "profile",
      href: href(lang, member.username ? `/u/${member.username}` : "/welcome"),
      label: copy.nav.profile[lang],
      icon: "user",
      active: member.username
        ? isActive(`/u/${member.username}`)
        : isActive("/welcome"),
      avatar: true,
    })
  } else {
    items.push({
      key: "profile",
      href: loginHref(lang, pathname),
      label: copy.nav.profile[lang],
      icon: "user",
      active: false,
    })
  }

  return (
    <nav
      aria-label={copy.navAria[lang]}
      className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-earth bg-bg md:hidden"
    >
      <ul className={cn("grid", member ? "grid-cols-4" : "grid-cols-3")}>
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1.5 text-[11px] sm:px-2 sm:text-[12px]",
                item.active ? "text-fg" : "text-muted",
              )}
            >
              {item.avatar && member ? (
                <ProfileAvatar
                  src={member.avatarUrl}
                  avatarConfig={member.avatarConfig}
                  userId={member.id}
                  alt={member.displayName ?? member.username ?? "PXLB"}
                  size="xs"
                />
              ) : (
                <PixelIcon name={item.icon} className="h-4 w-4" />
              )}
              <span
                className={cn(
                  "truncate",
                  item.active && "underline decoration-sky decoration-4 underline-offset-4",
                )}
              >
                {item.label}
              </span>
              {item.badge ? (
                <span
                  className="absolute right-[calc(50%-1.25rem)] top-2 h-2 w-2 bg-brick"
                  aria-label={copy.responsesNavDot[lang]}
                />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
