import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { StudioNewForm } from "@/components/creations/StudioNewForm"
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
    path: "/create",
    title: copy.createTitle,
    description: copy.createMeta,
    noIndex: true,
  })
}

export default async function CreatePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:px-16">
      <p className="pixel-kicker mb-3">{copy.createEyebrow[lang]}</p>
      <h1 className="pixel-title">{copy.createNewHeading[lang]}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{copy.createIntro[lang]}</p>
      <p className="mt-3 text-[14px]">
        <Link href={href(lang, "/dashboard")} className="text-muted underline decoration-earth underline-offset-4 hover:text-fg">
          {copy.createManageLink[lang]}
        </Link>
      </p>
      <div className="mt-10">
        <StudioNewForm lang={lang} />
      </div>
    </div>
  )
}
