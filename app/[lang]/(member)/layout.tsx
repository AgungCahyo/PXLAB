import type { ReactNode } from "react"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { getCurrentProfile, needsOnboarding } from "@/lib/auth/session"
import { isLang, stripLang } from "@/lib/i18n"
import { loginHref, safeInternalPath, welcomeHref } from "@/lib/paths"

export const instant = false

export default async function MemberLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const profile = await getCurrentProfile()
  const pathname = (await headers()).get("x-pathname")
  const next = safeInternalPath(pathname, "/")
  if (!profile) {
    redirect(loginHref(lang, next === "/" ? undefined : next))
  }
  const here = stripLang(pathname ?? "/")
  if (needsOnboarding(profile) && here !== "/welcome") {
    redirect(welcomeHref(lang, next === "/" ? undefined : next))
  }
  return children
}
