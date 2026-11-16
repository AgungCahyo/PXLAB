"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { registerAction, type AuthActionState } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"

export function RegisterForm({ lang, next }: { lang: Lang; next: string }) {
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    registerAction,
    null,
  )

  if (state && "ok" in state && state.needsEmail) {
    return (
      <Alert tone="info" className="mt-8">
        {copy.registerEmailSent[lang]}
      </Alert>
    )
  }

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
        id="displayName"
        name="displayName"
        type="text"
        autoComplete="nickname"
        required
        maxLength={50}
        label={copy.displayNameLabel[lang]}
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
      />
      <Button type="submit" disabled={pending}>
        {copy.registerSubmit[lang]}
      </Button>
      <Link href={loginHref(lang, next)} className="text-[14px] text-muted hover:text-fg">
        {copy.registerToLogin[lang]}
      </Link>
    </form>
  )
}
