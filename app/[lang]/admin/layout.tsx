import type { ReactNode } from "react"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { canAccessAdmin, isAdminRole } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/session"
import { isLang } from "@/lib/i18n"
import { loginHref, safeInternalPath } from "@/lib/paths"

export const instant = false

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const profile = await getCurrentProfile()
  if (!profile) {
    const pathname = (await headers()).get("x-pathname")
    redirect(loginHref(lang, safeInternalPath(pathname)))
  }
  if (!canAccessAdmin(isAdminRole(profile.role))) notFound()
  return children
}
