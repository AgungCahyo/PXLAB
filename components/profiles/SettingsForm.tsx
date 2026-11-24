"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { LogoutButton } from "@/components/auth/LogoutButton"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { PwaInstall } from "@/components/pwa/PwaInstall"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Input } from "@/components/ui/Input"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { Textarea } from "@/components/ui/Textarea"
import {
  removeAvatarAction,
  updateProfileAction,
  uploadAvatarAction,
  type ProfileActionState,
} from "@/features/profiles/actions"
import { prepareAvatarFile } from "@/lib/avatar-image"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"

function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
      {hint ? <p className="mt-1 text-[13px] leading-relaxed text-muted">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function SettingsForm({ lang, profile }: { lang: Lang; profile: MemberProfile }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dirtyRef = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<ProfileActionState>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [compressError, setCompressError] = useState(false)
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  )
  const [uploadState, uploadAction, uploadPending] = useActionState<ProfileActionState, FormData>(
    uploadAvatarAction,
    null,
  )
  const [removeState, removeAction, removePending] = useActionState<ProfileActionState, FormData>(
    removeAvatarAction,
    null,
  )

  useEffect(() => {
    if (state && "ok" in state) dirtyRef.current = false
  }, [state])

  useEffect(() => {
    if ((uploadState && "ok" in uploadState) || (removeState && "ok" in removeState)) {
      setPreview(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [uploadState, removeState])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  const leave = async () => {
    const form = formRef.current
    if (!form) return
    if (!dirtyRef.current) {
      router.push(href(lang, `/u/${profile.username}`))
      return
    }
    setLeaving(true)
    setLeaveError(null)
    const data = new FormData(form)
    const result = await updateProfileAction(null, data)
    if (result && "error" in result) {
      setLeaveError(result)
      setLeaving(false)
      return
    }
    dirtyRef.current = false
    const username = String(data.get("username") ?? profile.username)
    router.push(href(lang, `/u/${username}`))
  }

  const avatarSrc = preview ?? profile.avatar_url
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

  return (
    <div className="mt-6 grid gap-5">
      <button
        type="button"
        onClick={() => void leave()}
        disabled={leaving || pending}
        aria-busy={leaving || undefined}
        className={cn(socialButtonClass({ variant: "ghost", size: "sm" }), "w-fit")}
      >
        <PixelIcon name="back" />
        {leaving ? copy.settingsSaving[lang] : copy.settingsBack[lang]}
      </button>
      {leaveError && "error" in leaveError ? (
        <Alert tone="error" flat>
          {copy.errors[leaveError.error][lang]}
        </Alert>
      ) : null}

      <SettingsSection title={copy.avatarPhotoLabel[lang]} hint={copy.avatarPhotoHint[lang]}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="shrink-0 self-start">
            <ProfileAvatar
              src={avatarSrc}
              avatarConfig={profile.avatar_config}
              userId={profile.id}
              alt={profile.display_name ?? profile.username ?? "PXLB"}
              size="lg"
              className="border-0"
            />
          </div>
          <div className="flex min-w-0 flex-wrap gap-2">
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
        {compressError ? (
          <Alert tone="error" flat>
            {copy.avatarCompressFailed[lang]}
          </Alert>
        ) : null}
        {avatarError ? (
          <div className="mt-3">
            <Alert tone="error" flat>
              {copy.errors[avatarError.error][lang]}
            </Alert>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title={copy.profileTitle[lang]}>
        <form
          ref={formRef}
          action={action}
          className="grid gap-4"
          onChange={() => {
            dirtyRef.current = true
          }}
        >
          <input type="hidden" name="lang" value={lang} />
          {state && "error" in state ? (
            <Alert tone="error" flat>
              {copy.errors[state.error][lang]}
            </Alert>
          ) : null}
          {state && "ok" in state ? (
            <Alert tone="info" flat>
              {copy.settingsSaved[lang]}
            </Alert>
          ) : null}
          <Input
            appearance="social"
            id="displayName"
            name="displayName"
            type="text"
            required
            maxLength={50}
            defaultValue={profile.display_name ?? ""}
            label={copy.displayNameLabel[lang]}
          />
          <Input
            appearance="social"
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={20}
            defaultValue={profile.username ?? ""}
            label={copy.usernameLabel[lang]}
            hint={copy.usernameHint[lang]}
          />
          <Textarea
            appearance="social"
            id="bio"
            name="bio"
            maxLength={280}
            defaultValue={profile.bio ?? ""}
            label={copy.bioLabel[lang]}
          />
          <div className="pt-1">
            <button
              type="submit"
              disabled={pending || leaving}
              aria-busy={pending || undefined}
              className={socialButtonClass({ variant: "solid", size: "md" })}
            >
              {pending ? copy.settingsSaving[lang] : copy.settingsSave[lang]}
            </button>
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title={copy.settingsLanguage[lang]}>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <LanguageSwitch lang={lang} />
        </div>
      </SettingsSection>

      <SettingsSection title={copy.pwaInstallTitle[lang]} hint={copy.pwaInstallHint[lang]}>
        <PwaInstall lang={lang} variant="panel" />
      </SettingsSection>

      <SettingsSection title={copy.nav.signOut[lang]}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted">{copy.settingsSignOutHint[lang]}</p>
          <LogoutButton lang={lang} />
        </div>
      </SettingsSection>
    </div>
  )
}
