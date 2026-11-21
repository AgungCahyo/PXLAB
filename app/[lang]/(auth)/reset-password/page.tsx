import type { Metadata } from "next"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/AuthShell"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { RECOVERY_COOKIE, verifyRecoveryTicket } from "@/lib/auth/recovery"
import { copy } from "@/lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { authDestination, forgotPasswordHref } from "@/lib/paths"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  return pageMeta({
    lang,
    path: "/reset-password",
    title: copy.resetPasswordTitle,
    description: copy.resetPasswordMeta,
    noIndex: true,
  })
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const { next } = await searchParams
  const destination = authDestination(lang, next)

  // A normal session must never unlock this page — only a valid recovery ticket.
  const cookieStore = await cookies()
  const ticket = verifyRecoveryTicket(cookieStore.get(RECOVERY_COOKIE)?.value)
  if (!ticket) {
    const fallback = forgotPasswordHref(lang, destination)
    redirect(`${fallback}${fallback.includes("?") ? "&" : "?"}error=recovery_invalid`)
  }

  return (
    <AuthShell
      lang={lang}
      title={copy.resetPasswordTitle[lang]}
      intro={copy.resetPasswordMeta[lang]}
    >
      <ResetPasswordForm lang={lang} next={destination} />
    </AuthShell>
  )
}
