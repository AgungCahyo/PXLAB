"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import Link from "next/link"
import { Camera, ChevronRight, Globe, LogOut, Monitor, Package, Shield, User } from "lucide-react"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { PwaInstall } from "@/components/pwa/PwaInstall"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Dialog } from "@/components/ui/Dialog"
import {
  removeAvatarAction,
  uploadAvatarAction,
  type ProfileActionState,
} from "@/features/profiles/actions"
import { prepareAvatarFile } from "@/lib/avatar-image"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"

type ModalKey = "avatar" | "language" | "pwa" | "signout" | null

// ─── Nav sidebar ──────────────────────────────────────────────────────────────

type SectionKey = "profile" | "appearance" | "app" | "account"

const sections: {
  key: SectionKey
  icon: ReactNode
  labelId: string
  labelEn: string
}[] = [
  {
    key: "profile",
    icon: <User className="size-[18px]" strokeWidth={2} />,
    labelId: "Profil",
    labelEn: "Profile",
  },
  {
    key: "appearance",
    icon: <Globe className="size-[18px]" strokeWidth={2} />,
    labelId: "Tampilan",
    labelEn: "Appearance",
  },
  {
    key: "app",
    icon: <Monitor className="size-[18px]" strokeWidth={2} />,
    labelId: "Aplikasi",
    labelEn: "Application",
  },
  {
    key: "account",
    icon: <LogOut className="size-[18px]" strokeWidth={2} />,
    labelId: "Akun",
    labelEn: "Account",
  },
]

// ─── Shared primitives ────────────────────────────────────────────────────────

function SettingsCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-none border border-line bg-card ${className ?? ""}`}
    >
      {children}
    </div>
  )
}

function CardSection({
  title,
  description,
  children,
  separator = true,
}: {
  title?: string
  description?: string
  children: ReactNode
  separator?: boolean
}) {
  return (
    <div className={`px-5 py-5 sm:px-6 ${separator ? "border-t border-line first:border-t-0" : ""}`}>
      {title ? (
        <div className="mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function SettingsRow({
  icon,
  title,
  hint,
  value,
  onClick,
  href: to,
}: {
  icon?: ReactNode
  title: string
  hint?: string
  value?: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      {icon ? (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line bg-soft text-muted">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-fg">{title}</span>
        {hint ? (
          <span className="mt-0.5 block text-[12px] font-normal leading-snug text-muted">{hint}</span>
        ) : null}
      </span>
      {value ? (
        <span className="shrink-0 text-[13px] text-muted">{value}</span>
      ) : null}
      <span aria-hidden="true" className="shrink-0 text-muted">
        <ChevronRight className="size-4" />
      </span>
    </>
  )

  const cls =
    "flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left transition-colors hover:bg-soft"

  if (to) return <Link href={to} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
        active
          ? "bg-soft font-semibold text-fg"
          : "text-muted hover:bg-soft hover:text-fg"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] ${
          active ? "bg-[#ff4f00]/12 text-[#ff4f00]" : "bg-soft text-muted"
        }`}
      >
        {icon}
      </span>
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

/** Compact settings: rows open focused modals; identity lives on /profile/edit. */
export function SettingsForm({ lang, profile }: { lang: Lang; profile: MemberProfile }) {
  const [modal, setModal] = useState<ModalKey>(null)
  const [activeSection, setActiveSection] = useState<SectionKey>("profile")
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [compressError, setCompressError] = useState(false)
  const [uploadState, uploadAction, uploadPending] = useActionState<ProfileActionState, FormData>(
    uploadAvatarAction,
    null,
  )
  const [removeState, removeAction, removePending] = useActionState<ProfileActionState, FormData>(
    removeAvatarAction,
    null,
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const avatarSaved =
    (uploadState && "ok" in uploadState) || (removeState && "ok" in removeState)
  const avatarSrc = avatarSaved ? profile.avatar_url : (preview ?? profile.avatar_url)
  const avatarBusy = preparing || uploadPending || removePending
  const avatarError =
    uploadState && "error" in uploadState
      ? uploadState
      : removeState && "error" in removeState
        ? removeState
        : null

  async function onAvatarPicked(file: File) {
    setCompressError(false)
    setPreparing(true)
    if (preview) URL.revokeObjectURL(preview)
    const prepared = await prepareAvatarFile(file)
    if (!prepared) {
      setPreview(null)
      setCompressError(true)
      setPreparing(false)
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    const nextPreview = URL.createObjectURL(prepared)
    setPreview(nextPreview)
    const data = new FormData()
    data.set("lang", lang)
    data.set("avatar", prepared)
    startTransition(() => {
      uploadAction(data)
    })
    setPreparing(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const modalTitle =
    modal === "avatar"
      ? copy.avatarPhotoLabel[lang]
      : modal === "language"
        ? copy.settingsLanguage[lang]
        : modal === "pwa"
          ? copy.settingsRowPwa[lang]
          : modal === "signout"
            ? copy.nav.signOut[lang]
            : ""

  const sectionLabel = (s: (typeof sections)[0]) =>
    lang === "id" ? s.labelId : s.labelEn

  return (
    <>
      {/* ── Back link ─────────────────────────────────────── */}
      <div className="mt-5">
        <Link
          href={href(lang, `/u/${profile.username ?? ""}`)}
          className={socialButtonClass({ variant: "ghost", size: "sm" })}
        >
          <ChevronRight className="size-4 rotate-180" />
          {copy.settingsBack[lang]}
        </Link>
      </div>

      {/* ── Layout: sidebar + content ─────────────────────── */}
      <div className="mt-5 flex gap-6 lg:items-start">
        {/* Sidebar nav — desktop only */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <SettingsCard>
            <nav aria-label={copy.settingsTitle[lang]} className="p-2">
              <div className="space-y-0.5">
                {sections.map((s) => (
                  <NavItem
                    key={s.key}
                    active={activeSection === s.key}
                    icon={s.icon}
                    label={sectionLabel(s)}
                    onClick={() => setActiveSection(s.key)}
                  />
                ))}
              </div>
            </nav>
          </SettingsCard>
        </aside>

        {/* Main content area */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Mobile: flat list all sections */}
          <SettingsCard className="lg:hidden">
            {/* Profile section */}
            <CardSection title={lang === "id" ? "Profil" : "Profile"}>
              <div className="space-y-1">
                <SettingsRow
                  href={href(lang, "/profile/edit")}
                  icon={<User className="size-4" />}
                  title={copy.settingsEditProfile[lang]}
                  hint={copy.settingsEditProfileHint[lang]}
                />
                <SettingsRow
                  icon={<Camera className="size-4" />}
                  title={copy.settingsRowAvatar[lang]}
                  hint={copy.avatarPhotoHint[lang]}
                  onClick={() => setModal("avatar")}
                />
              </div>
            </CardSection>

            {/* Appearance section */}
            <CardSection title={lang === "id" ? "Tampilan" : "Appearance"}>
              <div className="space-y-1">
                <SettingsRow
                  icon={<Globe className="size-4" />}
                  title={copy.settingsRowLanguage[lang]}
                  hint={copy.settingsLanguageHint[lang]}
                  value={lang === "id" ? "ID" : "EN"}
                  onClick={() => setModal("language")}
                />
              </div>
            </CardSection>

            {/* Application section */}
            <CardSection title={lang === "id" ? "Aplikasi" : "Application"}>
              <div className="space-y-1">
                <SettingsRow
                  icon={<Package className="size-4" />}
                  title={copy.settingsRowPwa[lang]}
                  hint={copy.pwaInstallHint[lang]}
                  onClick={() => setModal("pwa")}
                />
              </div>
            </CardSection>

            {/* Account section */}
            <CardSection title={lang === "id" ? "Akun" : "Account"}>
              <div className="space-y-1">
                <a
                  href="#account-security"
                  className="flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left transition-colors hover:bg-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line bg-soft text-muted">
                    <Shield className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-fg">
                      {copy.settingsRowSecurity[lang]}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-normal leading-snug text-muted">
                      {copy.accountSecurityIntro[lang]}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    <ChevronRight className="size-4" />
                  </span>
                </a>
                <SettingsRow
                  icon={<LogOut className="size-4" />}
                  title={copy.settingsRowSignOut[lang]}
                  hint={copy.settingsSignOutHint[lang]}
                  onClick={() => setModal("signout")}
                />
              </div>
            </CardSection>
          </SettingsCard>

          {/* Desktop: show active section content */}
          {/* Profile section */}
          <SettingsCard className={activeSection === "profile" ? "hidden lg:block" : "lg:hidden"}>
            {/* Avatar row */}
            <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
              <ProfileAvatar
                src={avatarSrc}
                avatarConfig={profile.avatar_config}
                userId={profile.id}
                alt={profile.display_name ?? profile.username ?? "PXLB"}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-fg">
                  {profile.display_name ?? profile.username}
                </p>
                {profile.username ? (
                  <p className="text-[13px] text-muted">@{profile.username}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setModal("avatar")}
                className={socialButtonClass({ variant: "soft", size: "sm" })}
              >
                <Camera className="size-4" />
                {copy.settingsRowAvatar[lang]}
              </button>
            </div>

            <div className="border-t border-line px-5 py-4 sm:px-6">
              <div className="space-y-1">
                <SettingsRow
                  href={href(lang, "/profile/edit")}
                  icon={<User className="size-4" />}
                  title={copy.settingsEditProfile[lang]}
                  hint={copy.settingsEditProfileHint[lang]}
                />
              </div>
            </div>
          </SettingsCard>

          {/* Appearance section */}
          <SettingsCard
            className={activeSection === "appearance" ? "hidden lg:block" : "lg:hidden"}
          >
            <CardSection
              title={lang === "id" ? "Bahasa" : "Language"}
              description={copy.settingsLanguageHint[lang]}
            >
              <div className="mt-3 flex items-center gap-3">
                <LanguageSwitch lang={lang} />
                <p className="text-[13px] text-muted">
                  {lang === "id" ? "Bahasa Indonesia / English" : "Indonesian / English"}
                </p>
              </div>
            </CardSection>
          </SettingsCard>

          {/* Application section */}
          <SettingsCard className={activeSection === "app" ? "hidden lg:block" : "lg:hidden"}>
            <CardSection
              title={lang === "id" ? "Instal Aplikasi" : "Install App"}
              description={copy.pwaInstallHint[lang]}
            >
              <div className="mt-3">
                <PwaInstall lang={lang} variant="panel" />
              </div>
            </CardSection>
          </SettingsCard>

          {/* Account section */}
          <SettingsCard
            className={activeSection === "account" ? "hidden lg:block" : "lg:hidden"}
          >
            <CardSection title={lang === "id" ? "Sesi" : "Session"}>
              <div className="space-y-1">
                <a
                  href="#account-security"
                  className="flex w-full items-center gap-3 rounded-[2px] px-3 py-2.5 text-left transition-colors hover:bg-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-line bg-soft text-muted">
                    <Shield className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-fg">
                      {copy.settingsRowSecurity[lang]}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                      {copy.accountSecurityIntro[lang]}
                    </span>
                  </span>
                  <span aria-hidden="true" className="shrink-0 text-muted">
                    <ChevronRight className="size-4" />
                  </span>
                </a>
              </div>
            </CardSection>

            <div className="border-t border-line px-5 pb-5 sm:px-6">
              <p className="mb-3 text-[13px] text-muted">{copy.settingsSignOutHint[lang]}</p>
              <LogoutButton lang={lang} />
            </div>
          </SettingsCard>
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────── */}
      <Dialog
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modalTitle}
        closeLabel={copy.settingsDone[lang]}
        tone="social"
      >
        {modal === "avatar" ? (
          <div className="grid gap-5 px-5 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0">
                <ProfileAvatar
                  src={avatarSrc}
                  avatarConfig={profile.avatar_config}
                  userId={profile.id}
                  alt={profile.display_name ?? profile.username ?? "PXLB"}
                  size="lg"
                  className="border-0"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-[13px] leading-relaxed text-muted">
                  {copy.avatarPhotoHint[lang]}
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={avatarBusy}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return
                      void onAvatarPicked(file)
                    }}
                  />
                  <button
                    type="button"
                    disabled={avatarBusy}
                    onClick={() => fileRef.current?.click()}
                    className={socialButtonClass({ variant: "soft", size: "sm" })}
                  >
                    {preparing || uploadPending
                      ? copy.avatarUploading[lang]
                      : copy.avatarChooseFile[lang]}
                  </button>
                  {profile.avatar_url || preview ? (
                    <form action={removeAction}>
                      <input type="hidden" name="lang" value={lang} />
                      <button
                        type="submit"
                        disabled={avatarBusy}
                        aria-busy={removePending || undefined}
                        className={socialButtonClass({ variant: "ghost", size: "sm" })}
                      >
                        {removePending ? copy.avatarRemoving[lang] : copy.avatarRemove[lang]}
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
            {compressError ? (
              <Alert tone="error" flat>
                {copy.avatarCompressFailed[lang]}
              </Alert>
            ) : null}
            {avatarError ? (
              <Alert tone="error" flat>
                {copy.errors[avatarError.error][lang]}
              </Alert>
            ) : null}
          </div>
        ) : null}

        {modal === "language" ? (
          <div className="grid gap-4 px-5 py-5">
            <p className="text-[13px] leading-relaxed text-muted">
              {copy.settingsLanguageHint[lang]}
            </p>
            <LanguageSwitch lang={lang} className="w-full rounded-[2px]" />
          </div>
        ) : null}

        {modal === "pwa" ? (
          <div className="grid gap-4 px-5 py-5">
            <PwaInstall lang={lang} variant="panel" />
          </div>
        ) : null}

        {modal === "signout" ? (
          <div className="grid gap-4 px-5 py-5">
            <p className="text-[13px] leading-relaxed text-muted">
              {copy.settingsSignOutHint[lang]}
            </p>
            <LogoutButton lang={lang} className="w-full" />
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
