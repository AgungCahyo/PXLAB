import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { ResponsesInbox } from "@/components/community/ResponsesInbox"
import { PageTransition } from "@/components/layout/PageTransition"
import { BackLink } from "@/components/ui/BackLink"
import { PageHeader } from "@/components/ui/PageHeader"
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
        <BackLink href={href(lang, "/dashboard")}>{copy.nav.dashboard[lang]}</BackLink>
        <PageHeader
          className="mt-6"
          title={copy.responsesTitle[lang]}
          intro={copy.responsesIntro[lang]}
        />
        <ResponsesInbox lang={lang} items={items} />
      </div>
    </PageTransition>
  )
}
