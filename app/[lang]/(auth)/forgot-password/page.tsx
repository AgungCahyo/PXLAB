import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/AuthShell"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { authDestination } from "@/lib/paths"

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
    path: "/forgot-password",
    title: copy.forgotPasswordTitle,
    description: copy.forgotPasswordMeta,
    noIndex: true,
  })
}

export default async function ForgotPasswordPage({
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
  const profile = await getCurrentProfile()
  if (profile) redirect(destination)

  return (
    <AuthShell
      lang={lang}
      title={copy.forgotPasswordTitle[lang]}
      intro={copy.forgotPasswordMeta[lang]}
    >
      <ForgotPasswordForm lang={lang} next={destination} />
    </AuthShell>
  )
}
