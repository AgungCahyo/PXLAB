"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  registerAction,
  resendRegisterEmailAction,
  type AuthActionState,
} from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"

function fieldMessage(
  state: AuthActionState,
  field: "email" | "password" | "username" | "displayName",
  lang: Lang,
): string | undefined {
  if (!state || !("error" in state) || !state.fields?.[field]) return undefined
  return copy.errors[state.fields[field]][lang]
}

function RegisterEmailSent({
  lang,
  next,
  email,
  onChangeEmail,
}: {
  lang: Lang
  next: string
  email: string
  onChangeEmail: () => void
}) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    resendRegisterEmailAction,
    null,
  )
  const resent = Boolean(state && "ok" in state && "resent" in state && state.resent)
  const error =
    state && "error" in state ? copy.errors[state.error][lang] : null

  return (
    <div className="mt-8 grid gap-4">
      <Alert tone="info">{copy.registerEmailSent[lang]}</Alert>
      {email ? (
        <p className="text-[15px] text-fg">
          {copy.registerEmailSentTo[lang].replaceAll("{email}", email)}
        </p>
      ) : null}
      {resent ? <Alert tone="info">{copy.registerResent[lang]}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={email} />
        <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending || undefined}>
          {pending ? copy.registerResending[lang] : copy.registerResend[lang]}
        </Button>
      </form>
      <Link href={loginHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.registerToLogin[lang]}
      </Link>
      <Button type="button" variant="ghost" size="sm" onClick={onChangeEmail}>
        {copy.registerChangeEmail[lang]}
      </Button>
    </div>
  )
}

export function RegisterForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    registerAction,
    null,
  )
  const [emailSent, setEmailSent] = useState<{ email: string } | null>(null)

  useEffect(() => {
    if (state && "ok" in state && "needsEmail" in state && state.needsEmail) {
      setEmailSent({ email: state.email ?? "" })
    }
  }, [state])

  if (emailSent) {
    return (
      <RegisterEmailSent
        lang={lang}
        next={next}
        email={emailSent.email}
        onChangeEmail={() => setEmailSent(null)}
      />
    )
  }

  const emailError = fieldMessage(state, "email", lang)
  const passwordError = fieldMessage(state, "password", lang)
  const usernameError = fieldMessage(state, "username", lang)
  const displayNameError = fieldMessage(state, "displayName", lang)
  const formError =
    state &&
    "error" in state &&
    !emailError &&
    !passwordError &&
    !usernameError &&
    !displayNameError
      ? copy.errors[state.error][lang]
      : null

  return (
    <div className="mt-8 grid gap-4">
      <GoogleAuthButton lang={lang} next={next} />
      <form action={action} className="grid gap-4">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value={next} />
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={copy.emailLabel[lang]}
          error={emailError}
        />
        <Input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="nickname"
          required
          maxLength={50}
          label={copy.displayNameLabel[lang]}
          error={displayNameError}
        />
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          label={copy.usernameLabel[lang]}
          hint={copy.usernameHint[lang]}
          error={usernameError}
        />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          label={copy.passwordLabel[lang]}
          hint={copy.passwordHint[lang]}
          error={passwordError}
        />
        <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
          {pending ? copy.registerSubmitting[lang] : copy.registerSubmit[lang]}
        </Button>
        <Link href={loginHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
          {copy.registerToLogin[lang]}
        </Link>
      </form>
    </div>
  )
}
