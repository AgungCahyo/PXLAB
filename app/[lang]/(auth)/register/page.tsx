import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { RegisterForm } from "@/components/auth/RegisterForm"
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
    path: "/register",
    title: copy.registerTitle,
    description: copy.registerMeta,
    noIndex: true,
  })
}

export default async function RegisterPage({
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
    <div className="mx-auto max-w-xl px-5 py-16 sm:px-8 lg:px-16">
      <h1 className="pixel-title">{copy.registerTitle[lang]}</h1>
      <p className="mt-3 text-[15px] text-muted">{copy.registerMeta[lang]}</p>
      <RegisterForm lang={lang} next={destination} />
    </div>
  )
}
