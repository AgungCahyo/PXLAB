"use client"

import { useActionState } from "react"
import { AuthSwitchLink } from "@/components/auth/AuthShell"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  resendRegisterEmailAction,
  type AuthActionState,
} from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"

export function VerifyEmailForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    resendRegisterEmailAction,
    null,
  )
  const resent = Boolean(state && "ok" in state && "resent" in state && state.resent)
  const error = state && "error" in state ? copy.errors[state.error][lang] : null

  return (
    <div className="grid gap-4">
      {resent ? <Alert tone="info">{copy.verifyEmailSent[lang]}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form action={action} className="grid gap-4">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value={next} />
        <Input
          id="verify-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoCapitalize="none"
          spellCheck={false}
          label={copy.emailLabel[lang]}
        />
        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending || undefined}>
          {pending ? copy.verifyEmailSending[lang] : copy.verifyEmailSubmit[lang]}
        </Button>
      </form>
      <p className="text-[13px] leading-relaxed text-muted">{copy.verifyEmailHelp[lang]}</p>
      <AuthSwitchLink
        prompt={copy.verifyEmailBackPrompt[lang]}
        href={loginHref(lang, next)}
        label={copy.verifyEmailBack[lang]}
      />
    </div>
  )
}
