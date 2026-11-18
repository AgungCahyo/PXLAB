"use client"

import { useActionState, useEffect, useState } from "react"
import { AuthDivider, AuthSwitchLink } from "@/components/auth/AuthShell"
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton"
import { PasswordField } from "@/components/auth/PasswordField"
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
  field: "email" | "password",
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
  const error = state && "error" in state ? copy.errors[state.error][lang] : null

  return (
    <div className="grid gap-5">
      <Alert tone="info">{copy.registerEmailSent[lang]}</Alert>
      {email ? (
        <p className="text-[15px] leading-relaxed text-fg">
          {copy.registerEmailSentTo[lang].replaceAll("{email}", email)}
        </p>
      ) : null}
      {resent ? <Alert tone="info">{copy.registerResent[lang]}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={email} />
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? copy.registerResending[lang] : copy.registerResend[lang]}
        </Button>
      </form>
      <Button type="button" variant="ghost" className="w-full" onClick={onChangeEmail}>
        {copy.registerChangeEmail[lang]}
      </Button>
      <AuthSwitchLink
        prompt={copy.registerToLoginPrompt[lang]}
        href={loginHref(lang, next)}
        label={copy.registerToLogin[lang]}
      />
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
  const formError =
    state && "error" in state && !emailError && !passwordError
      ? copy.errors[state.error][lang]
      : null

  return (
    <div className="grid gap-5">
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
          autoCapitalize="none"
          spellCheck={false}
          label={copy.emailLabel[lang]}
          error={emailError}
        />
        <PasswordField
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          label={copy.passwordLabel[lang]}
          hint={copy.passwordHint[lang]}
          error={passwordError}
          showLabel={copy.authShowPassword[lang]}
          hideLabel={copy.authHidePassword[lang]}
        />
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending || undefined}>
          {pending ? copy.registerSubmitting[lang] : copy.registerSubmit[lang]}
        </Button>
      </form>

      <AuthDivider label={copy.authOrEmail[lang]} />
      <GoogleAuthButton lang={lang} next={next} />
      <AuthSwitchLink
        prompt={copy.registerToLoginPrompt[lang]}
        href={loginHref(lang, next)}
        label={copy.registerToLogin[lang]}
      />
    </div>
  )
}
