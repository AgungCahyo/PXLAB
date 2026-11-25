import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { AdminReports } from "@/components/moderation/AdminReports"
import { BackButton } from "@/components/ui/BackButton"
import { PageHeader } from "@/components/ui/PageHeader"
import { listAdminReports, parseReportFilter } from "@/features/moderation/queries"
import { copy } from "../../../lib/copy"
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
    path: "/admin",
    title: copy.adminTitle,
    description: copy.adminMeta,
    noIndex: true,
  })
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const { status } = await searchParams
  const filter = parseReportFilter(status)
  const reports = await listAdminReports(filter)

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:px-16">
      <BackButton
        fallbackHref={href(lang, "/home")}
        label={lang === "id" ? "Kembali" : "Back"}
        className="mb-4"
      />
      <PageHeader
        kicker={copy.nav.admin[lang]}
        title={copy.adminTitle[lang]}
        intro={copy.adminIntro[lang]}
      />
      <div className="mt-10">
        <AdminReports lang={lang} reports={reports} filter={filter} />
      </div>
    </div>
  )
}
