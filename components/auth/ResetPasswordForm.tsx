"use client"

import { useActionState } from "react"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { updatePasswordAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

export function ResetPasswordForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    updatePasswordAction,
    null,
  )
  const passwordError =
    state && "error" in state && state.fields?.password
      ? copy.errors[state.fields.password][lang]
      : undefined
  const formError =
    state && "error" in state && !passwordError ? copy.errors[state.error][lang] : null

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />
      {formError ? <Alert tone="error">{formError}</Alert> : null}
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
      <Input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        label={copy.resetPasswordConfirmLabel[lang]}
      />
      <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.resetPasswordSubmitting[lang] : copy.resetPasswordSubmit[lang]}
      </Button>
    </form>
  )
}
