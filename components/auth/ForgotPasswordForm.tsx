"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { requestPasswordResetAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"

export function ForgotPasswordForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordResetAction,
    null,
  )
  const sent = Boolean(state && "ok" in state && "resetSent" in state && state.resetSent)
  const emailError =
    state && "error" in state && state.fields?.email
      ? copy.errors[state.fields.email][lang]
      : undefined
  const formError =
    state && "error" in state && !emailError ? copy.errors[state.error][lang] : null

  if (sent) {
    return (
      <div className="mt-8 grid gap-4">
        <Alert tone="info">{copy.forgotPasswordSent[lang]}</Alert>
        <Link href={loginHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
          {copy.forgotPasswordBack[lang]}
        </Link>
      </div>
    )
  }

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
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.forgotPasswordSubmitting[lang] : copy.forgotPasswordSubmit[lang]}
      </Button>
      <Link href={loginHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.forgotPasswordBack[lang]}
      </Link>
    </form>
  )
}
