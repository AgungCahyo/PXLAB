import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { SettingsForm } from "@/components/profiles/SettingsForm"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"

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
    path: "/settings",
    title: copy.settingsTitle,
    description: copy.settingsMeta,
    noIndex: true,
  })
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const profile = await getCurrentProfile()
  if (!profile) notFound()

  return (
    <div className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:px-8 sm:py-10">
      <h1 className="pixel-title">{copy.settingsTitle[lang]}</h1>
      <SettingsForm lang={lang} profile={profile} />
    </div>
  )
}
