"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { loginAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { forgotPasswordHref, registerHref } from "@/lib/paths"

function fieldMessage(
  state: AuthActionState,
  field: "email" | "password",
  lang: Lang,
): string | undefined {
  if (!state || !("error" in state) || !state.fields?.[field]) return undefined
  return copy.errors[state.fields[field]][lang]
}

export function LoginForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(loginAction, null)
  const emailError = fieldMessage(state, "email", lang)
  const passwordError = fieldMessage(state, "password", lang)
  const formError =
    state && "error" in state && !emailError && !passwordError
      ? copy.errors[state.error][lang]
      : null

  return (
    <form action={action} className="mt-8 grid gap-4">
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
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={copy.passwordLabel[lang]}
        error={passwordError}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.loginSubmitting[lang] : copy.loginSubmit[lang]}
      </Button>
      <Link href={forgotPasswordHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.loginForgotPassword[lang]}
      </Link>
      <Link href={registerHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.loginToRegister[lang]}
      </Link>
    </form>
  )
}
