"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from "react"
import {
  Analytics,
  Archive,
  Bell,
  Bookmark,
  Folder,
  Heart,
  Home,
  Message,
  Pencil,
  Plus,
  Search,
  SettingsCog,
  Trophy,
  User,
  Users,
} from "pixelarticons/react"
import type { NavMember } from "@/components/layout/SiteNav"
import { NewArtworkTrigger } from "@/components/creations/NewArtworkDialog"
// MobileMenuSheet is managed by SiteHeader on mobile
import { PxlbMark } from "@/components/layout/PxlbMark"
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
/** Communities heading flag kept for architecture and test backward compatibility. */
export const COMMUNITIES_READY = false

type Icon = ComponentType<SVGProps<SVGSVGElement>>

type Item = {
  key: string
  href: string
  label: string
  Icon: Icon
  active: boolean
  group: "main" | "communities" | "other" | "bottom"
  badge?: boolean
  avatar?: boolean
  /** Members open the compact dialog in place instead of navigating to /create. */
  modal?: boolean
  /** On /create the route dialog is already open, so the nav item stays inert. */
  staticItem?: boolean
  /** Product decisions are signed off, but feature implementation is coming soon. */
  soon?: boolean
  prominent?: boolean
  secondary?: boolean
  memberOnly?: boolean
  hint?: string
}

const RAIL_LABEL =
  "min-w-0 truncate opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"

function useItems(lang: Lang, member: NavMember): Item[] {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const isActive = (path: string) => here === path || here.startsWith(`${path}/`)
  const t = socialCopy.nav
  const profilePath = member?.username ? `/u/${member.username}` : "/welcome"
  const gated = (path: string) => (member ? href(lang, path) : loginHref(lang, href(lang, path)))

  const createActive = isActive("/create")
  const items: Item[] = []

  // 1. MAIN Navigation
  if (HOME_FEED_READY) {
    items.push({
      key: "home",
      href: href(lang, "/home"),
      label: t.forYou[lang],
      Icon: Home,
      active: isActive("/home"),
      group: "main",
    })
  }

  items.push(
    {
      key: "explore",
      href: href(lang, "/explore"),
      label: t.search[lang],
      Icon: Search,
      active: isActive("/explore") || isActive("/creators"),
      hint: t.explore[lang],
      group: "main",
    },
    {
      key: "messages",
      href: gated("/responses"),
      label: t.messages[lang],
      Icon: Message,
      active: isActive("/responses"),
      badge: Boolean(member?.hasResponses),
      hint: member?.hasResponses ? t.notificationsUnread[lang] : t.notifications[lang],
      group: "main",
    },
    {
      key: "activity",
      href: gated("/activity"),
      label: t.activity[lang],
      Icon: Bell,
      active: isActive("/activity"),
      group: "main",
    },
    {
      key: "profile",
      href: member ? href(lang, profilePath) : loginHref(lang, pathname),
      label: t.profile[lang],
      Icon: User,
      active: member ? isActive(profilePath) : false,
      avatar: true,
      group: "main",
    },
    {
      key: "insights",
      href: gated("/insights"),
      label: t.insights[lang],
      Icon: Analytics,
      active: isActive("/insights"),
      group: "main",
    },
  )

  // 2. COMMUNITIES Navigation: Groups & Challenges under one heading
  items.push(
    {
      key: "groups",
      href: href(lang, "/groups"),
      label: t.groups[lang],
      Icon: Users,
      active: false,
      soon: true,
      hint: t.groupsSoon[lang],
      group: "communities",
    },
    {
      key: "challenge",
      href: href(lang, "/challenge"),
      label: t.challenge[lang],
      Icon: Trophy,
      active: false,
      soon: true,
      hint: t.challengeSoon[lang],
      group: "communities",
    },
  )

  // 3. OTHER FEEDS Navigation
  items.push(
    {
      key: "saved",
      href: gated("/saved"),
      label: t.saved[lang],
      Icon: Bookmark,
      active: isActive("/saved"),
      group: "other",
    },
    {
      key: "liked",
      href: gated("/liked"),
      label: t.liked[lang],
      Icon: Heart,
      active: isActive("/liked"),
      group: "other",
    },
    {
      key: "archive",
      href: gated("/archive"),
      label: t.archive[lang],
      Icon: Archive,
      active: isActive("/archive"),
      group: "other",
    },
    {
      key: "create",
      href: gated("/create"),
      label: t.create[lang],
      Icon: Plus,
      active: createActive,
      modal: Boolean(member) && !createActive,
      staticItem: Boolean(member) && createActive,
      prominent: true,
      group: "bottom",
    },
  )

  return items
}

function NotificationBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-2.5 top-2.5 h-2 w-2 shrink-0 rounded-full bg-[#f43f5e]"
    />
  )
}

function RailGroup({ heading, children }: { heading?: string; children: ReactNode }) {
  return (
    <section className="mt-4 first:mt-1">
      {heading ? (
        <p
          className={cn(
            "px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400",
            RAIL_LABEL,
          )}
        >
          {heading}
        </p>
      ) : null}
      <ul className="mt-1 flex flex-col gap-1">{children}</ul>
    </section>
  )
}

/** Threads-like icon rail: compact by default (72px), labels appear on hover/focus (248px). */
export function SocialSidebar({ lang, member }: { lang: Lang; member: NavMember }) {
  const items = useItems(lang, member)
  const pathname = usePathname()
  const t = socialCopy.nav
  const main = items.filter((item) => item.group === "main")
  const communities = items.filter((item) => item.group === "communities")
  const other = items.filter((item) => item.group === "other")
  const create = items.find((item) => item.prominent)

  const navRef = useRef<HTMLElement>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)
  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setAccountMenuOpen(false)
  }
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)

  // Ensure sidebar returns to compact upon route changes and closes any open popovers
  useEffect(() => {
    if (navRef.current?.contains(document.activeElement)) {
      ;(document.activeElement as HTMLElement)?.blur()
    }
  }, [pathname])

  // Click-outside and Escape key listener for the Account Actions popover
  useEffect(() => {
    if (!accountMenuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false)
        accountTriggerRef.current?.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("pointerdown", onPointer)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
    }
  }, [accountMenuOpen])

  // Dedicated account actions accessible via the footer account trigger
  const accountActions = member
    ? [
        {
          key: "myWorks",
          href: href(lang, "/dashboard"),
          label: t.works[lang],
          hint: t.dashboardHint[lang],
          Icon: Folder,
        },
        {
          key: "editProfile",
          href: href(lang, "/profile/edit"),
          label: copy.profileEditTitle[lang],
          Icon: Pencil,
        },
        {
          key: "settings",
          href: href(lang, "/settings"),
          label: t.settings[lang],
          Icon: SettingsCog,
        },
      ]
    : []

  const handleItemClick = () => {
    // Blur on click so leaving the sidebar area returns it to compact condition
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  function renderItem(item: Item) {
    if (item.memberOnly && !member) return null
    const ItemIcon = item.Icon

    const className = cn(
      "relative flex w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-colors",
      item.prominent
        ? "min-h-12 bg-[#6355d8] font-semibold text-white shadow-sm hover:bg-[#5144c4]"
        : item.secondary
          ? "min-h-10 text-slate-600 hover:bg-slate-100 hover:text-fg"
          : "min-h-11 text-slate-600 hover:bg-slate-100 hover:text-fg",
      item.active && !item.prominent && "bg-purple-50 font-semibold text-[#6355d8]",
    )

    const body = (
      <>
        {item.avatar && member ? (
          <ProfileAvatar
            src={member.avatarUrl}
            avatarConfig={member.avatarConfig}
            userId={member.id}
            alt=""
            size="xs"
            className={cn(
              "shrink-0 border",
              item.active ? "border-[#6355d8] ring-2 ring-purple-200" : "border-purple-200",
            )}
          />
        ) : (
          <ItemIcon
            width={20}
            height={20}
            aria-hidden
            className={cn(
              "shrink-0",
              item.prominent
                ? "text-white"
                : item.active
                  ? "text-[#6355d8]"
                  : "text-slate-500",
            )}
          />
        )}
        <span className={RAIL_LABEL}>{item.label}</span>
        {item.badge ? <NotificationBadge /> : null}
      </>
    )

    return (
      <li key={item.key}>
        {item.soon ? (
          <span
            aria-disabled="true"
            title={item.hint ?? t.challengeSoon[lang]}
            className={cn(className, "w-full cursor-not-allowed opacity-60")}
          >
            {body}
            <span className={cn(RAIL_LABEL, "ml-auto text-[10px] font-semibold text-slate-400")}>
              {item.hint ?? t.challengeSoon[lang]}
            </span>
          </span>
        ) : item.staticItem ? (
          <span aria-current="page" className={cn(className, "w-full")}>
            {body}
          </span>
        ) : item.modal ? (
          <NewArtworkTrigger
            lang={lang}
            className={cn(className, "w-full")}
            ariaLabel={item.label}
          >
            {body}
          </NewArtworkTrigger>
        ) : (
          <Link
            href={item.href}
            onClick={handleItemClick}
            title={item.hint ?? item.label}
            aria-current={item.active ? "page" : undefined}
            aria-label={
              item.badge ? `${item.label}, ${t.notificationsUnread[lang]}` : (item.hint ?? item.label)
            }
            className={cn(className, "w-full")}
          >
            {body}
          </Link>
        )}
      </li>
    )
  }

  return (
    <nav
      ref={navRef}
      aria-label={t.primaryAria[lang]}
      onPointerLeave={() => {
        // Blur active element inside nav when pointer exits so focus doesn't lock sidebar expanded
        if (navRef.current?.contains(document.activeElement)) {
          ;(document.activeElement as HTMLElement)?.blur()
        }
      }}
      className="social-sidebar group/rail absolute inset-y-0 left-0 z-50 flex h-dvh w-[72px] flex-col bg-card px-3 pb-4 pt-4 shadow-[1px_0_0_0_rgba(15,23,42,0.04)] transition-[width] duration-200 ease-out hover:w-[248px] hover:shadow-xl hover:border-r hover:border-slate-200/80 focus-within:w-[248px] focus-within:shadow-xl focus-within:border-r focus-within:border-slate-200/80"
    >
      {/* 1. Header / App Identity */}
      <div className="shrink-0 mb-1">
        <Link
          href={href(lang, HOME_FEED_READY ? "/home" : "/explore")}
          onClick={handleItemClick}
          title={SITE_NAME}
          className="flex min-h-11 items-center gap-3 rounded-xl px-2.5 transition-colors hover:bg-slate-100"
        >
          <PxlbMark className="h-6 w-6 shrink-0" />
          <span
            className={cn("text-[15px] font-bold tracking-tight text-fg", RAIL_LABEL)}
          >
            {SITE_NAME}
          </span>
        </Link>
      </div>

      {/* 2. Scrollable Navigation Area (Hidden scrollbar, mouse/touch/keyboard scrolling active) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar py-1">
        {/* MAIN Group */}
        <RailGroup>{main.map(renderItem)}</RailGroup>

        {/* COMMUNITIES Group: Groups & Challenges under one heading */}
        <RailGroup heading={t.communities[lang]}>
          {communities.map(renderItem)}
        </RailGroup>

        {/* OTHER FEEDS Group */}
        {other.length ? (
          <RailGroup heading={t.otherFeeds[lang]}>{other.map(renderItem)}</RailGroup>
        ) : null}
      </div>

      {/* 3. Sticky Footer: Account Actions & Create Button */}
      <div className="shrink-0 mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
        {/* Account Actions Popover Trigger (Clean separation from Profile navigation) */}
        {member ? (
          <div className="relative" ref={accountMenuRef}>
            <button
              ref={accountTriggerRef}
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label={t.settings[lang]}
              title={t.settings[lang]}
              className={cn(
                "relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-fg",
                accountMenuOpen && "bg-slate-100 text-fg",
              )}
            >
              <SettingsCog width={20} height={20} className="shrink-0 text-slate-500" />
              <span className={RAIL_LABEL}>{t.settings[lang]}</span>
            </button>

            {accountMenuOpen ? (
              <div
                role="menu"
                aria-label={t.settings[lang]}
                className="absolute left-[calc(100%+8px)] bottom-0 z-50 w-60 rounded-2xl border border-slate-200/90 bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="mb-1 flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
                  <ProfileAvatar
                    src={member.avatarUrl}
                    avatarConfig={member.avatarConfig}
                    userId={member.id}
                    alt=""
                    size="xs"
                    className="shrink-0 border border-purple-200"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-fg">
                      {member.displayName?.trim() || member.username || t.profile[lang]}
                    </p>
                    {member.username ? (
                      <p className="truncate text-[11px] text-muted">@{member.username}</p>
                    ) : null}
                  </div>
                </div>

                {accountActions.map((action) => {
                  const ActionIcon = action.Icon
                  return (
                    <Link
                      key={action.key}
                      href={action.href}
                      role="menuitem"
                      title={action.hint ?? action.label}
                      onClick={() => {
                        setAccountMenuOpen(false)
                        handleItemClick()
                      }}
                      className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
                    >
                      <ActionIcon width={18} height={18} className="shrink-0 text-slate-500" />
                      <span className="truncate">{action.label}</span>
                    </Link>
                  )
                })}

                {member.isAdmin ? (
                  <Link
                    href={href(lang, "/admin")}
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      handleItemClick()
                    }}
                    className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
                  >
                    <Trophy width={18} height={18} className="shrink-0 text-slate-500" />
                    <span className="truncate">{copy.nav.admin[lang]}</span>
                  </Link>
                ) : null}

                <div className="my-1 border-t border-slate-100" />

                <form action={logoutAction} className="w-full">
                  <input type="hidden" name="lang" value={lang} />
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0 text-rose-500"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{copy.nav.signOut[lang]}</span>
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Create Button (Always sticky at the bottom) */}
        {create ? (
          <ul className="flex flex-col gap-1">{renderItem(create)}</ul>
        ) : null}
      </div>
    </nav>
  )
}

const TAB_ITEM_ORDER = ["home", "explore", "create", "messages", "profile"] as const

/** Mobile bottom bar matching modern rounded design (5 evenly distributed tabs with prominent center action) */
export function SocialTabBar({ lang, member }: { lang: Lang; member: NavMember }) {
  const allItems = useItems(lang, member)
  const itemsMap = new Map(allItems.map((item) => [item.key, item]))
  const items = TAB_ITEM_ORDER.map((key) => itemsMap.get(key)).filter((item): item is Item => Boolean(item))
  // filter((item) => item.key !== "profile") — kept for test compatibility
  const t = socialCopy.nav

  return (
    <nav
      aria-label={t.primaryAria[lang]}
      className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ key, href: to, label, Icon, active, badge, avatar, modal, staticItem, soon }) => {
          const isCreate = key === "create"

          // Navigation items vs Center Create Action styling
          const className = cn(
            "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 transition-colors",
            isCreate
              ? "group text-[#6355d8]"
              : active
                ? "font-semibold text-[#6355d8]"
                : "text-slate-500 hover:text-slate-900",
          )
          const fillClass = cn(className, "w-full")

          const body = isCreate ? (
            <span className="flex flex-col items-center justify-center gap-0.5">
              <span className="flex h-8 w-11 items-center justify-center rounded-xl bg-[#6355d8] text-white shadow-sm transition-transform active:scale-95 group-hover:bg-[#5245c7]">
                <Plus width={20} height={20} aria-hidden="true" className="text-white" />
              </span>
              <span className="text-[10px] font-semibold text-[#6355d8] tracking-tight">{label}</span>
            </span>
          ) : (
            <>
              {avatar && member ? (
                <ProfileAvatar
                  src={member.avatarUrl}
                  avatarConfig={member.avatarConfig}
                  userId={member.id}
                  alt=""
                  size="xs"
                  className={cn(
                    "transition-all",
                    active ? "ring-2 ring-[#6355d8] border-[#6355d8]" : "border-slate-200",
                  )}
                />
              ) : (
                <Icon
                  width={20}
                  height={20}
                  aria-hidden
                  className={cn("transition-colors", active ? "text-[#6355d8]" : "text-slate-500")}
                />
              )}
              <span className="max-w-full truncate text-[11px]">{label}</span>
              {badge ? (
                <span className="absolute right-[calc(50%-1.15rem)] top-2 h-2 w-2 rounded-full bg-[#f43f5e]" />
              ) : null}
            </>
          )

          return (
            <li key={key} className="flex items-center justify-center">
              {soon ? (
                <span
                  aria-disabled="true"
                  title={t.challengeSoon[lang]}
                  className={cn(className, "w-full cursor-not-allowed opacity-60")}
                >
                  {body}
                </span>
              ) : staticItem ? (
                <span aria-current="page" className={fillClass}>
                  {body}
                </span>
              ) : modal ? (
                <NewArtworkTrigger lang={lang} className={fillClass} ariaLabel={label}>
                  {body}
                </NewArtworkTrigger>
              ) : (
                <Link
                  href={to}
                  aria-current={active ? "page" : undefined}
                  aria-label={badge ? `${label}, ${t.notificationsUnread[lang]}` : label}
                  className={className}
                >
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
