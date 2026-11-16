import { Suspense, type ReactNode } from "react"
import { SiteFooter } from "@/components/layout/SiteFooter"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { ViewTransitionGuard } from "@/components/layout/ViewTransitionGuard"
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
    <div className="relative flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <ViewTransitionGuard />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <Suspense fallback={<SiteHeader lang={lang} member={null} />}>
          <AuthHeader lang={lang} />
        </Suspense>
        <main id="main" className="min-w-0 flex-1 pt-[66px]">
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}

async function AuthHeader({ lang }: { lang: Lang }) {
  const profile = await getCurrentProfile()
  const member = profile
    ? {
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        isAdmin: profile.role === "admin",
      }
    : null
  return <SiteHeader lang={lang} member={member} />
}
