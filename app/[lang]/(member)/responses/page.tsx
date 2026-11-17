import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ResponsesInbox } from "@/components/community/ResponsesInbox"
import { PageTransition } from "@/components/layout/PageTransition"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { listCreationResponses } from "@/features/community/activity"
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
    path: "/responses",
    title: copy.responsesTitle,
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
    <PageTransition>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16">
        <Link
          href={href(lang, "/dashboard")}
          className="inline-flex h-11 w-fit items-center gap-2 border-[3px] border-earth bg-card px-3 text-[14px] font-medium"
        >
          <PixelIcon name="back" />
          {copy.nav.dashboard[lang]}
        </Link>
        <h1 className="pixel-title mt-6">{copy.responsesTitle[lang]}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          {copy.responsesIntro[lang]}
        </p>
        <ResponsesInbox lang={lang} items={items} />
      </div>
    </PageTransition>
  )
}
