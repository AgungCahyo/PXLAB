"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  completeOnboardingAction,
  skipOnboardingAction,
  type ProfileActionState,
} from "@/features/profiles/actions"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { authDestination } from "@/lib/paths"

export function WelcomeForm({
  lang,
  profile,
  next,
}: {
  lang: Lang
  profile: MemberProfile
  next: string
}) {
  const [done, setDone] = useState(false)
  const [completeState, completeAction, completePending] = useActionState<
    ProfileActionState,
    FormData
  >(async (prev, formData) => {
    const result = await completeOnboardingAction(prev, formData)
    if (result && "ok" in result) setDone(true)
    return result
  }, null)
  const [skipState, skipAction, skipPending] = useActionState<ProfileActionState, FormData>(
    async (prev, formData) => {
      const result = await skipOnboardingAction(prev, formData)
      if (result && "ok" in result) setDone(true)
      return result
    },
    null,
  )

  const pending = completePending || skipPending
  const errorState =
    completeState && "error" in completeState
      ? completeState
      : skipState && "error" in skipState
        ? skipState
        : null
  const exploreHref = authDestination(lang, next)

  if (done) {
    return (
      <div className="mt-8 grid gap-4">
        <p className="text-[15px] leading-relaxed text-muted">{copy.welcomeReady[lang]}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={href(lang, "/create")} className={buttonClassName({ variant: "primary" })}>
            {copy.welcomeCreate[lang]}
          </Link>
          <Link href={exploreHref} className={buttonClassName({ variant: "outline" })}>
            {copy.welcomeExplore[lang]}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-4">
      {errorState ? <Alert tone="error">{copy.errors[errorState.error][lang]}</Alert> : null}
      <form action={completeAction} className="grid gap-4">
        <input type="hidden" name="lang" value={lang} />
        <Input
          id="username"
          name="username"
          required
          autoComplete="username"
          defaultValue={profile.username}
          label={copy.usernameLabel[lang]}
          hint={copy.usernameHint[lang]}
        />
        <Input
          id="displayName"
          name="displayName"
          required
          autoComplete="nickname"
          defaultValue={profile.display_name ?? ""}
          label={copy.displayNameLabel[lang]}
        />
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {completePending ? copy.welcomeSubmitting[lang] : copy.welcomeSubmit[lang]}
        </Button>
      </form>
      <form action={skipAction}>
        <input type="hidden" name="lang" value={lang} />
        <Button type="submit" variant="ghost" disabled={pending} aria-busy={pending || undefined}>
          {copy.welcomeSkip[lang]}
        </Button>
      </form>
    </div>
  )
}
