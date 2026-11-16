import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm"
import { Alert } from "@/components/ui/Alert"
import { getSessionUserId } from "@/lib/auth/session"
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
  const userId = await getSessionUserId()

  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:px-8 lg:px-16">
      <h1 className="pixel-title">{copy.resetPasswordTitle[lang]}</h1>
      <p className="mt-3 text-[15px] text-muted">{copy.resetPasswordMeta[lang]}</p>
      {userId ? (
        <ResetPasswordForm lang={lang} next={destination} />
      ) : (
        <div className="mt-8 grid gap-4">
          <Alert tone="warning">{copy.resetPasswordInvalid[lang]}</Alert>
          <Link
            href={forgotPasswordHref(lang, destination)}
            className="text-[14px] text-muted hover:text-fg"
          >
            {copy.forgotPasswordTitle[lang]}
          </Link>
        </div>
      )}
    </div>
  )
}