import { Suspense, type ReactNode } from "react"
import { SiteFooter } from "@/components/layout/SiteFooter"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { getCurrentProfile } from "@/lib/auth/session"
import type { Lang } from "@/lib/i18n"

export function PublicShell({
  children,
  lang,
}: {
  children: ReactNode
  lang: Lang
}) {
  return (
    <div className="flex min-h-dvh flex-col pb-16 md:pb-0">
      <Suspense fallback={<SiteHeader lang={lang} member={null} />}>
        <AuthHeader lang={lang} />
      </Suspense>
      <main id="main" className="flex-1 pt-[66px]">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

async function AuthHeader({ lang }: { lang: Lang }) {
  const profile = await getCurrentProfile()
  const member = profile
    ? {
        username: profile.username,
        displayName: profile.display_name,
        isAdmin: profile.role === "admin",
      }
    : null
  return <SiteHeader lang={lang} member={member} />
}
