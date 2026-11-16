"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { loginAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { registerHref } from "@/lib/paths"

export function LoginForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(loginAction, null)

  return (
    <form action={action} className="mt-8 grid gap-4">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />
      {state && "error" in state ? (
        <Alert tone="error">{copy.errors[state.error][lang]}</Alert>
      ) : null}
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label={copy.emailLabel[lang]}
      />
      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        label={copy.passwordLabel[lang]}
      />
      <Button type="submit" disabled={pending}>
        {copy.loginSubmit[lang]}
      </Button>
      <Link href={registerHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.loginToRegister[lang]}
      </Link>
    </form>
  )
}
