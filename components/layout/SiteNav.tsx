"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { buttonClassName } from "@/components/ui/Button"
import { focusMenuItem, handleMenuKeyDown } from "@/components/ui/menuKeyboard"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
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
  const triggerId = useId()
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** Which item to focus the next time the menu opens (APG menu button). */
  const pendingFocusRef = useRef<"first" | "last">("first")
  const [accountOpen, setAccountOpen] = useState(false)
  const authNext =
    here === "/" || here === "/login" || here === "/register" ? undefined : pathname

  useEffect(() => {
    if (!accountOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false)
        // Escape closes the menu and returns focus to its trigger.
        triggerRef.current?.focus()
      }
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

  // Move focus into the menu when it opens (first item, or last for ArrowUp).
  useEffect(() => {
    if (!accountOpen) return
    focusMenuItem(menuRef.current, pendingFocusRef.current)
    pendingFocusRef.current = "first"
  }, [accountOpen])

  const itemClass = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center px-3 text-[14px] font-medium leading-snug",
      active ? "text-fg underline decoration-[#ff4f00] decoration-2 underline-offset-8" : "text-muted hover:text-fg",
    )

  const profilePath = member ? `/u/${member.username}` : null
  const accountActive =
    Boolean(member) &&
    (isActive("/dashboard") ||
      isActive("/activity") ||
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
        <div className="relative ml-1 hidden md:block" ref={menuRef}>
          <button
            type="button"
            id={triggerId}
            ref={triggerRef}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-controls={menuId}
            aria-label={copy.nav.account[lang]}
            onClick={() => setAccountOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                pendingFocusRef.current = event.key === "ArrowUp" ? "last" : "first"
                setAccountOpen(true)
              }
            }}
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
                aria-label={socialCopy.nav.notificationsUnread[lang]}
              />
            ) : null}
          </button>
          {accountOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-labelledby={triggerId}
              onKeyDown={(event) =>
                handleMenuKeyDown(event, {
                  onClose: () => {
                    setAccountOpen(false)
                    triggerRef.current?.focus()
                  },
                })
              }
              className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-2xl border border-slate-200/90 bg-card p-1.5 shadow-xl"
            >
              <Link
                href={href(lang, member.username ? `/u/${member.username}` : "/welcome")}
                onClick={() => setAccountOpen(false)}
                role="menuitem"
                tabIndex={-1}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
              >
                <PixelIcon name="user" />
                {copy.nav.profile[lang]}
              </Link>
              <Link
                href={href(lang, "/dashboard")}
                onClick={() => setAccountOpen(false)}
                role="menuitem"
                tabIndex={-1}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
              >
                <PixelIcon name="folder" />
                {copy.nav.dashboard[lang]}
              </Link>
              <Link
                href={href(lang, "/activity")}
                onClick={() => setAccountOpen(false)}
                role="menuitem"
                tabIndex={-1}
                className="relative flex min-h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
              >
                <PixelIcon name="heart" />
                {socialCopy.nav.activity[lang]}
                {member.hasResponses ? (
                  <span className="ml-auto h-2 w-2 rounded-full bg-brick" aria-hidden />
                ) : null}
              </Link>
              <Link
                href={href(lang, "/settings")}
                onClick={() => setAccountOpen(false)}
                role="menuitem"
                tabIndex={-1}
                className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
              >
                <PixelIcon name="pencil" />
                {copy.nav.settings[lang]}
              </Link>
              {member.isAdmin ? (
                <Link
                  href={href(lang, "/admin")}
                  onClick={() => setAccountOpen(false)}
                  role="menuitem"
                  tabIndex={-1}
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 text-[14px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
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


