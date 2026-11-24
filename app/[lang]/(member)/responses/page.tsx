import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PixelCatDecoration } from "@/components/brand/PixelCatDecoration"
import { ResponsesInbox } from "@/components/community/ResponsesInbox"
import { listCreationResponses } from "@/features/community/activity"
import { getCurrentProfile } from "@/lib/auth/session"
import { copy } from "../../../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
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
    path: "/responses",
    title: socialCopy.notifications.title,
    description: copy.responsesMeta,
    noIndex: true,
  })
}

export default async function ResponsesPage({
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

  const items = await listCreationResponses({ markSeen: true })

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6">
        <PixelCatDecoration variant="waving" size="lg" position="top-right" className="opacity-90" />
        <div className="relative z-[1] max-w-xl pr-16 sm:pr-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">PXLB</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">
            {socialCopy.notifications.title[lang]}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">{copy.responsesIntro[lang]}</p>
        </div>
      </header>
      <ResponsesInbox lang={lang} items={items} />
    </div>
  )
}
