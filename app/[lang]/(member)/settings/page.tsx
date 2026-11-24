import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PixelCatDecoration } from "@/components/brand/PixelCatDecoration"
import { AccountSecurity } from "@/components/account/AccountSecurity"
import { SettingsForm } from "@/components/profiles/SettingsForm"
import { Alert } from "@/components/ui/Alert"
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/session"
import { accountProvider } from "@/lib/auth/account-security"
import { copy } from "../../../../lib/copy"
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
    <div className="mx-auto w-full min-w-0 max-w-3xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <header className="relative min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6">
        <PixelCatDecoration variant="reading" size="lg" position="top-right" className="opacity-90" />
        <div className="relative z-[1] max-w-2xl pr-16 sm:pr-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">PXLB</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">
            {copy.settingsTitle[lang]}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{copy.settingsIntro[lang]}</p>
        </div>
      </header>
      {query.email === "updated" ? (
        <div className="mt-4">
          <Alert tone="info" flat>
            {copy.settingsEmailUpdated[lang]}
          </Alert>
        </div>
      ) : null}
      {query.session === "others" ? (
        <div className="mt-4">
          <Alert tone="info" flat>
            {copy.sessionOthersDone[lang]}
          </Alert>
        </div>
      ) : null}
      {query.error ? (
        <div className="mt-4">
          <Alert tone="error" flat>
            {copy.errors.limit_reached[lang]}
          </Alert>
        </div>
      ) : null}
      <SettingsForm lang={lang} profile={profile} />
      <div className="mt-6">
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
