import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { AccountSecurity } from "@/components/account/AccountSecurity"
import { SettingsForm } from "@/components/profiles/SettingsForm"
import { Alert } from "@/components/ui/Alert"
import { PageHeader } from "@/components/ui/PageHeader"
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/session"
import { accountProvider } from "@/lib/auth/account-security"
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
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ email?: string; session?: string; error?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const [profile, user, query] = await Promise.all([
    getCurrentProfile(),
    getCurrentAuthUser(),
    searchParams,
  ])
  if (!profile || !user) notFound()

  return (
    <div className="mx-auto w-full min-w-0 max-w-2xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
      <PageHeader
        kicker={copy.nav.settings[lang]}
        title={copy.settingsTitle[lang]}
        intro={copy.settingsIntro[lang]}
      />
      {query.email === "updated" ? (
        <div className="mb-6">
          <Alert tone="info">{copy.settingsEmailUpdated[lang]}</Alert>
        </div>
      ) : null}
      {query.session === "others" ? (
        <div className="mb-6">
          <Alert tone="info">{copy.sessionOthersDone[lang]}</Alert>
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-6">
          <Alert tone="error">{copy.errors.limit_reached[lang]}</Alert>
        </div>
      ) : null}
      <SettingsForm lang={lang} profile={profile} />
      <div className="mt-8">
        <AccountSecurity
          lang={lang}
          email={user.email ?? ""}
          provider={accountProvider(user)}
          lastSignInAt={user.last_sign_in_at ?? null}
        />
      </div>
    </div>
  )
}
