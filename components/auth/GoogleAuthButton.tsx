"use client"

import { useActionState } from "react"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { signInWithGoogleAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

export function GoogleAuthButton({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    signInWithGoogleAction,
    null,
  )
  const error = state && "error" in state ? copy.errors[state.error][lang] : null

  return (
    <div className="grid gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <form action={action}>
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? copy.authContinueGoogleWorking[lang] : copy.authContinueGoogle[lang]}
        </Button>
      </form>
      <p className="text-center text-[12px] font-medium uppercase tracking-[0.14em] text-muted">
        {copy.authOrEmail[lang]}
      </p>
    </div>
  )
}
