import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { CreateInspiration } from "@/components/creations/CreateInspiration"
import { PixelNewForm } from "@/components/creations/PixelNewForm"
import { listPublishedCreations } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
import { href, isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import type { CreationCategory } from "@/lib/site"
import type { CreationCard } from "@/features/creations/queries"

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

  const sizes: CreationCategory[] = ["icon", "small", "sprite"]
  const results = await Promise.all(
    sizes.map((category) =>
      listPublishedCreations({ type: "pixel", category, page: 1 }).then((result) => ({
        category,
        items: result.failed ? ([] as CreationCard[]) : result.items.slice(0, 4),
      })),
    ),
  )
  const bySize = Object.fromEntries(
    results.map((entry) => [entry.category, entry.items]),
  ) as Partial<Record<CreationCategory, CreationCard[]>>

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <header className="min-w-0">
        <h1 className="text-[17px] font-semibold text-fg">{copy.createTitle[lang]}</h1>
        <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted">{copy.createIntro[lang]}</p>
        <Link
          href={href(lang, "/dashboard")}
          className="mt-1 inline-flex min-h-11 items-center text-[13px] text-muted hover:text-fg"
        >
          {copy.createManageLink[lang]}
        </Link>
      </header>

      <div className="mt-6 min-w-0">
        <PixelNewForm lang={lang} variant="dialog" />
      </div>

      <CreateInspiration lang={lang} bySize={bySize} />
    </div>
  )
}
