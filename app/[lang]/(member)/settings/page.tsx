import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { AccountSecurity } from "@/components/account/AccountSecurity"
import { SettingsForm } from "@/components/profiles/SettingsForm"
import { Alert } from "@/components/ui/Alert"
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
    <div className="mx-auto w-full min-w-0 max-w-2xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <header className="min-w-0">
        <h1 className="text-[17px] font-semibold text-fg">{copy.settingsTitle[lang]}</h1>
        <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">{copy.settingsIntro[lang]}</p>
      </header>
      {query.email === "updated" ? (
        <div className="mb-6 mt-4">
          <Alert tone="info" flat>
            {copy.settingsEmailUpdated[lang]}
          </Alert>
        </div>
      ) : null}
      {query.session === "others" ? (
        <div className="mb-6 mt-4">
          <Alert tone="info" flat>
            {copy.sessionOthersDone[lang]}
          </Alert>
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-6 mt-4">
          <Alert tone="error" flat>
            {copy.errors.limit_reached[lang]}
          </Alert>
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
