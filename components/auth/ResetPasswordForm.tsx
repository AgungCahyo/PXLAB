"use client"

import { useActionState } from "react"
import { PasswordField } from "@/components/auth/PasswordField"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { updatePasswordAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "../../lib/copy"
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
    <form action={action} className="grid gap-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />
      {formError ? <Alert tone="error">{formError}</Alert> : null}
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
      <PasswordField
        id="confirm"
        name="confirm"
        autoComplete="new-password"
        required
        minLength={8}
        label={copy.resetPasswordConfirmLabel[lang]}
        showLabel={copy.authShowPassword[lang]}
        hideLabel={copy.authHidePassword[lang]}
      />
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.resetPasswordSubmitting[lang] : copy.resetPasswordSubmit[lang]}
      </Button>
    </form>
  )
}
