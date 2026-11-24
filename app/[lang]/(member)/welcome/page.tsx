import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { WelcomeForm } from "@/components/profiles/WelcomeForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { getCurrentProfile, needsOnboarding } from "@/lib/auth/session"
import { copy } from "../../../../lib/copy"
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
    path: "/welcome",
    title: copy.welcomeTitle,
    description: copy.welcomeMeta,
    noIndex: true,
  })
}

export default async function WelcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ next?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) notFound()

  const { next } = await searchParams
  const destination = authDestination(lang, next)

  if (!needsOnboarding(profile)) {
    redirect(destination)
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl px-5 py-10 sm:px-8 sm:py-14 lg:px-16">
      <PageHeader title={copy.welcomeTitle[lang]} intro={copy.welcomeIntro[lang]} />
      <WelcomeForm lang={lang} profile={profile} next={destination} />
    </div>
  )
}
