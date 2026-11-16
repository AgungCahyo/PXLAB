import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { SettingsForm } from "@/components/profiles/SettingsForm"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"

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
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:px-16">
      <h1 className="pixel-title">
        {copy.settingsTitle[lang]}
      </h1>
      <p className="mt-3 text-[15px] text-muted">{copy.settingsMeta[lang]}</p>
      <SettingsForm lang={lang} profile={profile} />
    </div>
  )
}
