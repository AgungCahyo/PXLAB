"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { Textarea } from "@/components/ui/Textarea"
import { updateProfileAction, type ProfileActionState } from "@/features/profiles/actions"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"

export function SettingsForm({ lang, profile }: { lang: Lang; profile: MemberProfile }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const dirtyRef = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<ProfileActionState>(null)
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    updateProfileAction,
    null,
  )

  useEffect(() => {
    if (state && "ok" in state) dirtyRef.current = false
  }, [state])

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

  return (
    <form
      ref={formRef}
      action={action}
      className="mt-8 grid max-w-xl gap-4"
      onChange={() => {
        dirtyRef.current = true
      }}
    >
      <button
        type="button"
        onClick={() => void leave()}
        disabled={leaving || pending}
        aria-busy={leaving || undefined}
        className="inline-flex h-11 w-fit items-center gap-2 border-[3px] border-earth bg-card px-3 text-[14px] font-medium disabled:opacity-50"
      >
        <PixelIcon name="back" />
        {leaving ? copy.settingsSaving[lang] : copy.settingsBack[lang]}
      </button>
      {leaveError && "error" in leaveError ? (
        <Alert tone="error">{copy.errors[leaveError.error][lang]}</Alert>
      ) : null}
      <input type="hidden" name="lang" value={lang} />
      {state && "error" in state ? (
        <Alert tone="error">{copy.errors[state.error][lang]}</Alert>
      ) : null}
      {state && "ok" in state ? <Alert tone="info">{copy.settingsSaved[lang]}</Alert> : null}
      <Input
        id="displayName"
        name="displayName"
        type="text"
        required
        maxLength={50}
        defaultValue={profile.display_name ?? ""}
        label={copy.displayNameLabel[lang]}
      />
      <Input
        id="username"
        name="username"
        type="text"
        required
        minLength={3}
        maxLength={20}
        defaultValue={profile.username}
        label={copy.usernameLabel[lang]}
        hint={copy.usernameHint[lang]}
      />
      <Textarea
        id="bio"
        name="bio"
        maxLength={280}
        defaultValue={profile.bio ?? ""}
        label={copy.bioLabel[lang]}
      />
      <Input
        id="role"
        type="text"
        readOnly
        value={profile.role}
        label={copy.roleLabel[lang]}
        hint={copy.roleHint[lang]}
      />
      <Button type="submit" disabled={pending || leaving} aria-busy={pending || undefined}>
        {pending ? copy.settingsSaving[lang] : copy.settingsSave[lang]}
      </Button>
    </form>
  )
}
