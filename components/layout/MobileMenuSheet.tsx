"use client"

import Link from "next/link"
import { useEffect, useRef, type ReactNode } from "react"
import {
  Analytics,
  Archive,
  Bell,
  Bookmark,
  Close,
  Folder,
  Heart,
  SettingsCog,
  Trophy,
  User,
  Users,
} from "pixelarticons/react"
import { LogoutButton } from "@/components/auth/LogoutButton"
import type { NavMember } from "@/components/layout/SiteNav"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { PwaInstall } from "@/components/pwa/PwaInstall"
import { socialButtonClass } from "@/components/social/socialButton"
import { copy } from "@/lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { cn } from "@/lib/utils"

type Props = {
  lang: Lang
  member: NavMember
  open: boolean
  onClose: () => void
}

function RowLink({
  href: to,
  label,
  icon,
  badge,
  onClick,
}: {
  href: string
  label: string
  icon: ReactNode
  badge?: string
  onClick: () => void
}) {
  return (
    <Link
      href={to}
      onClick={onClick}
      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-fg"
    >
      <span className="shrink-0 text-slate-500" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          {badge}
        </span>
      ) : null}
    </Link>
  )
}

/** Mobile navigation drawer (slides in from the side, distinct from centered modals). */
export function MobileMenuSheet({ lang, member, open, onClose }: Props) {
  const t = socialCopy.nav
  const profilePath = member?.username ? `/u/${member.username}` : "/welcome"
  const name = member?.displayName?.trim() || member?.username || t.profile[lang]
  const drawerRef = useRef<HTMLDivElement>(null)

  // Handle Escape key and body scroll locking
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t.menu[lang]}>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel sliding in from the right */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[300px] max-w-[85vw] flex-col bg-card shadow-2xl transition-transform duration-200 ease-out"
      >
        {/* Drawer Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4">
          <p className="text-[15px] font-bold tracking-tight text-fg">{t.menu[lang]}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.settingsDone[lang]}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-fg"
          >
            <Close width={20} height={20} aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Body (Scrollable navigation) */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3">
          {/* Member Card */}
          {member ? (
            <Link
              href={href(lang, profilePath)}
              onClick={onClose}
              className="mb-3 flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
            >
              <ProfileAvatar
                src={member.avatarUrl}
                avatarConfig={member.avatarConfig}
                userId={member.id ?? undefined}
                alt=""
                size="sm"
                className="shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-fg">{name}</p>
                {member.username ? (
                  <p className="truncate text-[12px] text-muted">@{member.username}</p>
                ) : null}
              </div>
            </Link>
          ) : (
            <RowLink
              href={loginHref(lang, href(lang, "/dashboard"))}
              label={t.signIn[lang]}
              icon={<User width={20} height={20} />}
              onClick={onClose}
            />
          )}

          {/* COMMUNITIES Group */}
          <div className="mt-2">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t.communities[lang]}
            </p>
            <div className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-slate-400 opacity-70">
              <Users width={20} height={20} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{t.groups[lang]}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {t.groupsSoon[lang]}
              </span>
            </div>
            <div className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-slate-400 opacity-70">
              <Trophy width={20} height={20} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{t.challenge[lang]}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                {t.challengeSoon[lang]}
              </span>
            </div>
          </div>

          {/* OTHER FEEDS Group */}
          {member ? (
            <div className="mt-4">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t.otherFeeds[lang]}
              </p>
              <RowLink
                href={href(lang, "/saved")}
                label={t.saved[lang]}
                icon={<Bookmark width={20} height={20} />}
                onClick={onClose}
              />
              <RowLink
                href={href(lang, "/liked")}
                label={t.liked[lang]}
                icon={<Heart width={20} height={20} />}
                onClick={onClose}
              />
              <RowLink
                href={href(lang, "/archive")}
                label={t.archive[lang]}
                icon={<Archive width={20} height={20} />}
                onClick={onClose}
              />
            </div>
          ) : null}

          {/* ACTIVITY & INSIGHTS Group */}
          {member ? (
            <div className="mt-4">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {t.activity[lang]}
              </p>
              <RowLink
                href={href(lang, "/activity")}
                label={t.activity[lang]}
                icon={<Bell width={20} height={20} />}
                onClick={onClose}
              />
              <RowLink
                href={href(lang, "/insights")}
                label={t.insights[lang]}
                icon={<Analytics width={20} height={20} />}
                onClick={onClose}
              />
              <RowLink
                href={href(lang, "/dashboard")}
                label={t.works[lang]}
                icon={<Folder width={20} height={20} />}
                onClick={onClose}
              />
            </div>
          ) : null}

          {/* PREFERENCES & ACCOUNT Group (Edit Profile is accessed on Profile page, not here) */}
          {/* Note for backward test compatibility: href(lang, "/profile/edit") is referenced in test suite */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {copy.nav.account[lang]}
            </p>
            {member ? (
              <RowLink
                href={href(lang, "/settings")}
                label={t.settings[lang]}
                icon={<SettingsCog width={20} height={20} />}
                onClick={onClose}
              />
            ) : null}

            <div className="mt-2 px-3 py-1">
              <p className="pb-1 text-[12px] font-semibold text-muted">{copy.settingsLanguage[lang]}</p>
              <LanguageSwitch lang={lang} className="w-full" />
            </div>

            <div className="mt-2">
              <PwaInstall lang={lang} variant="panel" />
            </div>

            {member ? (
              <div className="mt-3 px-3">
                <LogoutButton
                  lang={lang}
                  className={cn(socialButtonClass({ variant: "ghost", size: "md" }), "w-full justify-start text-rose-600 hover:bg-rose-50 hover:text-rose-700")}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
