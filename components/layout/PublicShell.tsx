import { Suspense, type ReactNode } from "react"
import { CornerBusy } from "@/components/layout/CornerBusy"
import { PixelWorldBackdrop } from "@/components/layout/PixelWorldBackdrop"
import { SiteFooter } from "@/components/layout/SiteFooter"
import { SiteHeader } from "@/components/layout/SiteHeader"
import { ViewTransitionGuard } from "@/components/layout/ViewTransitionGuard"
import { PwaInstall } from "@/components/pwa/PwaInstall"
import { ToastProvider } from "@/components/social/Toast"
import { PwaRegister } from "@/components/pwa/PwaRegister"
import { hasUnseenCreationResponses } from "@/features/community/activity"
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
    <ToastProvider>
    <div className="relative flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <ViewTransitionGuard />
      <PixelWorldBackdrop />
      <div className="shell-content relative z-10 flex min-h-dvh flex-col">
        <Suspense fallback={<SiteHeader lang={lang} member={null} />}>
          <AuthHeader lang={lang} />
        </Suspense>
        <main id="main" className="min-w-0 flex-1 pt-[66px]">
          {children}
        </main>
        <SiteFooter />
      </div>
      <Suspense fallback={null}>
        <CornerBusy lang={lang} />
      </Suspense>
      <PwaRegister />
      <PwaInstall lang={lang} variant="banner" />
    </div>
    </ToastProvider>
  )
}

async function AuthHeader({ lang }: { lang: Lang }) {
  const profile = await getCurrentProfile()
  const hasResponses = profile ? await hasUnseenCreationResponses() : false
  const member = profile
    ? {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        avatarConfig: profile.avatar_config,
        isAdmin: profile.role === "admin",
        hasResponses,
      }
    : null
  return <SiteHeader lang={lang} member={member} />
}
