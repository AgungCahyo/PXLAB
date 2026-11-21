"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType, SVGProps } from "react"
import { Bell, Home, Plus, Search, User } from "pixelarticons/react"
import type { NavMember } from "@/components/layout/SiteNav"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { socialCopy } from "@/lib/copy-social"
import { href, stripLang, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { SITE_NAME } from "@/lib/site"
import { cn } from "@/lib/utils"

/** /[lang]/home exists (Phase 5). Set to false to hide Home from the nav without touching the route. */
export const HOME_FEED_READY = true

type Icon = ComponentType<SVGProps<SVGSVGElement>>

type Item = {
  key: string
  href: string
  label: string
  Icon: Icon
  active: boolean
  badge?: boolean
  avatar?: boolean
}

function useItems(lang: Lang, member: NavMember): Item[] {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const isActive = (path: string) => here === path || here.startsWith(`${path}/`)
  const t = socialCopy.nav
  const profilePath = member?.username ? `/u/${member.username}` : "/welcome"
  const gated = (path: string) => (member ? href(lang, path) : loginHref(lang, href(lang, path)))

  const items: Item[] = []
  if (HOME_FEED_READY) {
    items.push({
      key: "home",
      href: href(lang, "/home"),
      label: t.home[lang],
      Icon: Home,
      active: isActive("/home"),
    })
  }
  items.push(
    {
      key: "explore",
      href: href(lang, "/explore"),
      label: t.explore[lang],
      Icon: Search,
      active: isActive("/explore") || isActive("/creators"),
    },
    {
      key: "create",
      href: gated("/create"),
      label: t.create[lang],
      Icon: Plus,
      active: isActive("/create"),
    },
    {
      key: "notifications",
      href: gated("/responses"),
      label: t.notifications[lang],
      Icon: Bell,
      active: isActive("/responses"),
      badge: Boolean(member?.hasResponses),
    },
    {
      key: "profile",
      href: member ? href(lang, profilePath) : loginHref(lang, pathname),
      label: t.profile[lang],
      Icon: User,
      active: member ? isActive(profilePath) : false,
      avatar: true,
    },
  )
  return items
}

function Dot({ label }: { label: string }) {
  return <span className="absolute h-2 w-2 bg-brick" role="img" aria-label={label} />
}

/** Desktop (md+) left rail for members. Rendered inside a `header.fixed.site-header`
 *  so existing Studio chrome rules (hide while drawing, leave-guard) keep working. */
export function SocialSidebar({ lang, member }: { lang: Lang; member: NavMember }) {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const isActive = (path: string) => here === path || here.startsWith(`${path}/`)
  const items = useItems(lang, member)
  const t = socialCopy.nav
  const secondary = [
    { key: "works", href: "/dashboard", label: t.works[lang] },
    { key: "settings", href: "/settings", label: t.settings[lang] },
    ...(member?.isAdmin ? [{ key: "admin", href: "/admin", label: t.admin[lang] }] : []),
  ]

  return (
    <nav
      aria-label={t.primaryAria[lang]}
      className="social-sidebar flex h-full w-full flex-col px-3 pb-4 pt-5"
    >
      <Link
        href={href(lang, HOME_FEED_READY ? "/home" : "/explore")}
        className="mb-4 flex min-h-11 items-center gap-2.5 px-3"
      >
        <PxlbMark />
        <span className="pixel-brand">{SITE_NAME}</span>
      </Link>
      <ul className="flex flex-col gap-1">
        {items.map(({ key, href: to, label, Icon, active, badge, avatar }) => (
          <li key={key}>
            <Link
              href={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 items-center gap-3.5 px-3 text-[15px] transition-colors",
                "hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky",
                active ? "bg-soft font-semibold text-fg" : "font-medium text-muted hover:text-fg",
              )}
            >
              {avatar && member ? (
                <ProfileAvatar
                  src={member.avatarUrl}
                  avatarConfig={member.avatarConfig}
                  userId={member.id}
                  alt=""
                  size="xs"
                />
              ) : (
                <Icon width={22} height={22} aria-hidden className="shrink-0" />
              )}
              <span className="truncate">{label}</span>
              {badge ? <Dot label={t.notificationsUnread[lang]} /> : null}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-0.5 border-t-2 border-soft pt-3">
        {secondary.map((item) => (
          <Link
            key={item.key}
            href={href(lang, item.href)}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center px-3 text-[13px] hover:bg-soft hover:text-fg",
              isActive(item.href) ? "font-semibold text-fg" : "text-muted",
            )}
          >
            {item.label}
          </Link>
        ))}
        <div className="px-1 pt-1">
          <LanguageSwitch lang={lang} className="h-9" />
        </div>
      </div>
    </nav>
  )
}

/** Mobile bottom bar for everyone. Same `.app-tabbar` hook as before (Studio hides/guards it). */
export function SocialTabBar({ lang, member }: { lang: Lang; member: NavMember }) {
  const items = useItems(lang, member)
  const t = socialCopy.nav

  return (
    <nav
      aria-label={t.primaryAria[lang]}
      className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-earth bg-bg md:hidden"
      style={{ viewTransitionName: "site-tabbar" }}
    >
      <ul className={cn("grid", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {items.map(({ key, href: to, label, Icon, active, badge, avatar }) => (
          <li key={key}>
            <Link
              href={to}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px]",
                "active:bg-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky",
                active ? "font-semibold text-fg" : "text-muted",
              )}
            >
              {avatar && member ? (
                <ProfileAvatar
                  src={member.avatarUrl}
                  avatarConfig={member.avatarConfig}
                  userId={member.id}
                  alt=""
                  size="xs"
                />
              ) : (
                <Icon width={22} height={22} aria-hidden />
              )}
              <span
                className={cn(
                  "max-w-full truncate",
                  active && "underline decoration-sky decoration-4 underline-offset-4",
                )}
              >
                {label}
              </span>
              {badge ? (
                <span className="absolute right-[calc(50%-1.5rem)] top-2">
                  <Dot label={t.notificationsUnread[lang]} />
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
