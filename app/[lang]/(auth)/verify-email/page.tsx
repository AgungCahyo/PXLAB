import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/AuthShell"
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm"
import { Alert } from "@/components/ui/Alert"
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/session"
import { needsEmailVerification } from "@/lib/auth/verification"
import { copy } from "../../../../lib/copy"
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
    path: "/verify-email",
    title: copy.verifyEmailTitle,
    description: copy.verifyEmailMeta,
    noIndex: true,
  })
}

export default async function VerifyEmailPage({
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

  // A verified user (including Google OAuth) has no reason to see this page.
  const user = await getCurrentAuthUser()
  if (user && !needsEmailVerification(user)) {
    redirect(postAuthPath(lang, destination, await getCurrentProfile()))
  }

  return (
    <AuthShell
      lang={lang}
      title={copy.verifyEmailTitle[lang]}
      intro={copy.verifyEmailMeta[lang]}
    >
      <div className="grid gap-4">
        {error === "expired" ? (
          <Alert tone="warning">{copy.verifyEmailExpired[lang]}</Alert>
        ) : null}
        {error && error !== "expired" ? (
          <Alert tone="warning">{copy.verifyEmailInvalid[lang]}</Alert>
        ) : null}
        <VerifyEmailForm lang={lang} next={destination} />
      </div>
    </AuthShell>
  )
}
