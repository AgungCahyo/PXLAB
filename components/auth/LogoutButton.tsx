"use client"

import { Button } from "@/components/ui/Button"
import { logoutAction } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

export function LogoutButton({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <form action={logoutAction}>
      <input type="hidden" name="lang" value={lang} />
      <Button type="submit" variant="ghost" size="sm" className={className}>
        {copy.nav.signOut[lang]}
      </Button>
    </form>
  )
}
