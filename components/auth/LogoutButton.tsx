"use client"

import { socialButtonClass } from "@/components/social/socialButton"
import { logoutAction } from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LogoutButton({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <form action={logoutAction}>
      <input type="hidden" name="lang" value={lang} />
      <button type="submit" className={cn(socialButtonClass({ variant: "ghost", size: "sm" }), className)}>
        {copy.nav.signOut[lang]}
      </button>
    </form>
  )
}
