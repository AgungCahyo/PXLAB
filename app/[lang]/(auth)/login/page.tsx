import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/AuthShell"
import { LoginForm } from "@/components/auth/LoginForm"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { authDestination, postAuthPath } from "@/lib/paths"

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
    path: "/login",
    title: copy.loginTitle,
    description: copy.loginMeta,
    noIndex: true,
  })
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  const { next, error } = await searchParams
  const destination = authDestination(lang, next)
  const profile = await getCurrentProfile()
  if (profile) redirect(postAuthPath(lang, next, profile))

  return (
    <AuthShell lang={lang} title={copy.loginTitle[lang]} intro={copy.loginMeta[lang]}>
      <LoginForm
        lang={lang}
        next={destination}
        oauthError={error === "oauth" || error === "oauth_email" ? error : null}
      />
    </AuthShell>
  )
}
