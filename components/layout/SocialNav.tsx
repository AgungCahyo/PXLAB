"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ComponentType, SVGProps } from "react"
import { Bell, Home, Plus, Search, User } from "pixelarticons/react"
import type { NavMember } from "@/components/layout/SiteNav"
import { PxlbMark } from "@/components/layout/PxlbMark"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { logoutAction } from "@/features/auth/actions"
import { copy } from "../../lib/copy"
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

function NotificationBadge({ count = 3 }: { count?: number }) {
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f43f5e] px-1.5 text-[11px] font-bold text-white shadow-sm"
      role="status"
      aria-label="3 notifikasi baru"
    >
      {count}
    </span>
  )
}

/** Desktop (md+) left rail for members matching Reference Screenshot */
export function SocialSidebar({ lang, member }: { lang: Lang; member: NavMember }) {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const isActive = (path: string) => here === path || here.startsWith(`${path}/`)
  const items = useItems(lang, member)
  const t = socialCopy.nav

  return (
    <nav
      aria-label={t.primaryAria[lang]}
      className="social-sidebar flex h-full w-full flex-col justify-between px-4 pb-5 pt-6"
    >
      <div className="flex flex-col">
        {/* Brand Header */}
        <Link
          href={href(lang, HOME_FEED_READY ? "/home" : "/explore")}
          className="mb-6 flex min-h-11 items-center gap-3 px-3 transition-opacity hover:opacity-85"
        >
          <PxlbMark className="h-7 w-7" />
          <span className="text-[19px] font-bold tracking-tight text-fg">{SITE_NAME}</span>
        </Link>

        {/* Primary Navigation Items */}
        <ul className="flex flex-col gap-1.5">
          {items.map(({ key, href: to, label, Icon, active, badge, avatar }) => (
            <li key={key}>
              <Link
                href={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-3.5 rounded-2xl px-3.5 text-[14px] font-medium transition-all",
                  active
                    ? "bg-[#f0edff] font-semibold text-[#6355d8] shadow-sm shadow-purple-500/5"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-fg",
                )}
              >
                {avatar && member ? (
                  <ProfileAvatar
                    src={member.avatarUrl}
                    avatarConfig={member.avatarConfig}
                    userId={member.id}
                    alt=""
                    size="xs"
                    className="border border-purple-200"
                  />
                ) : (
                  <Icon
                    width={20}
                    height={20}
                    aria-hidden
                    className={cn("shrink-0", active ? "text-[#6355d8]" : "text-slate-500")}
                  />
                )}
                <span className="truncate">{label}</span>
                {badge ? <NotificationBadge count={3} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom Section: Karya saya & Keluar Button matching Screenshot */}
      <div className="mt-auto flex flex-col gap-3 border-t border-slate-200/70 pt-4">
        {/* Karya saya link block */}
        <Link
          href={href(lang, "/dashboard")}
          className={cn(
            "group block rounded-2xl px-3 py-2 transition-colors",
            isActive("/dashboard") ? "bg-[#f0edff]/60" : "hover:bg-slate-100/60",
          )}
        >
          <p
            className={cn(
              "text-[14px] font-semibold leading-snug",
              isActive("/dashboard") ? "text-[#6355d8]" : "text-fg group-hover:text-[#6355d8]",
            )}
          >
            {lang === "id" ? "Karya saya" : "My creations"}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">
            {lang === "id" ? "Pengaturan & lainnya" : "Settings & more"}
          </p>
        </Link>

        {/* Keluar (Logout) Form Button */}
        {member ? (
          <form action={logoutAction} className="w-full">
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              className="flex min-h-10 w-full items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-card px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-fg active:scale-[0.98]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-muted"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>{copy.nav.signOut[lang]}</span>
            </button>
          </form>
        ) : null}

        {/* Language switch */}
        <div className="pt-1">
          <LanguageSwitch lang={lang} className="h-9 w-full rounded-xl" />
        </div>
      </div>
    </nav>
  )
}

/** Mobile bottom bar matching modern rounded design */
export function SocialTabBar({ lang, member }: { lang: Lang; member: NavMember }) {
  const items = useItems(lang, member)
  const t = socialCopy.nav

  return (
    <nav
      aria-label={t.primaryAria[lang]}
      className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-card/95 backdrop-blur-md md:hidden"
    >
      <ul className={cn("grid", items.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {items.map(({ key, href: to, label, Icon, active, badge, avatar }) => (
          <li key={key}>
            <Link
              href={to}
              aria-current={active ? "page" : undefined}
              aria-label={badge ? `${label}, ${t.notificationsUnread[lang]}` : label}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors",
                active ? "font-semibold text-[#6355d8]" : "text-muted hover:text-fg",
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
                <Icon
                  width={20}
                  height={20}
                  aria-hidden
                  className={active ? "text-[#6355d8]" : "text-muted"}
                />
              )}
              <span className="max-w-full truncate">{label}</span>
              {badge ? (
                <span className="absolute right-[calc(50%-1.25rem)] top-2 h-2 w-2 rounded-full bg-[#f43f5e]" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
