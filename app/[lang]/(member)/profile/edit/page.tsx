import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ProfileEditForm } from "@/components/profiles/ProfileEditForm"
import { BackButton } from "@/components/ui/BackButton"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, isLang } from "@/lib/i18n"
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
    path: "/profile/edit",
    title: copy.profileEditTitle,
    description: copy.profileEditIntro,
    noIndex: true,
  })
}

export default async function ProfileEditPage({
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
    <div className="mx-auto w-full min-w-0 max-w-xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      {/* Back navigation */}
      <BackButton
        fallbackHref={href(lang, "/settings")}
        label={lang === "id" ? "Kembali" : "Back"}
      />

      {/* Page heading */}
      <div className="mt-4 mb-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">
          PXLB
        </p>
        <h1 className="mt-1.5 text-[22px] font-semibold tracking-tight text-fg sm:text-[26px]">
          {copy.profileEditTitle[lang]}
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          {copy.profileEditIntro[lang]}
        </p>
      </div>

      <ProfileEditForm lang={lang} profile={profile} />
    </div>
  )
}
