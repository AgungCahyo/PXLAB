"use client"

import { useActionState } from "react"
import Link from "next/link"
import { AuthDivider, AuthSwitchLink } from "@/components/auth/AuthShell"
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton"
import { PasswordField } from "@/components/auth/PasswordField"
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

export function LoginForm({
  lang,
  next,
  oauthError = null,
}: {
  lang: Lang
  next: string
  oauthError?: "oauth" | "oauth_email" | null
}) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(loginAction, null)
  const emailError = fieldMessage(state, "email", lang)
  const passwordError = fieldMessage(state, "password", lang)
  const formError =
    state && "error" in state && !emailError && !passwordError
      ? copy.errors[state.error][lang]
      : null
  const oauthMessage =
    oauthError === "oauth_email"
      ? copy.errors.oauth_email_conflict[lang]
      : oauthError === "oauth"
        ? copy.errors.oauth_failed[lang]
        : null

  return (
    <div className="grid gap-5">
      {oauthMessage ? <Alert tone="error">{oauthMessage}</Alert> : null}

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
        <div className="grid gap-2">
          <PasswordField
            id="password"
            name="password"
            autoComplete="current-password"
            required
            label={copy.passwordLabel[lang]}
            error={passwordError}
            showLabel={copy.authShowPassword[lang]}
            hideLabel={copy.authHidePassword[lang]}
          />
          <div className="flex justify-end">
            <Link
              href={forgotPasswordHref(lang, next)}
              className="text-[13px] text-muted underline decoration-earth/50 underline-offset-4 hover:text-fg"
            >
              {copy.loginForgotPassword[lang]}
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending || undefined}>
          {pending ? copy.loginSubmitting[lang] : copy.loginSubmit[lang]}
        </Button>
      </form>

      <AuthDivider label={copy.authOrEmail[lang]} />
      <GoogleAuthButton lang={lang} next={next} />
      <AuthSwitchLink
        prompt={copy.loginToRegisterPrompt[lang]}
        href={registerHref(lang, next)}
        label={copy.loginToRegister[lang]}
      />
    </div>
  )
}
