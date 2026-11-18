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
    <div className="mx-auto w-full min-w-0 max-w-5xl px-5 py-8 sm:px-8 sm:py-10 lg:px-16">
      <header className="max-w-2xl">
        <p className="pixel-kicker mb-3">{copy.createEyebrow[lang]}</p>
        <h1 className="pixel-title">{copy.createTitle[lang]}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{copy.createIntro[lang]}</p>
        <p className="mt-2 text-[13px]">
          <Link
            href={href(lang, "/dashboard")}
            className="text-muted underline-offset-4 hover:text-fg hover:underline"
          >
            {copy.createManageLink[lang]}
          </Link>
        </p>
      </header>

      <div className="mt-8 min-w-0">
        <PixelNewForm lang={lang} />
      </div>

      <CreateInspiration lang={lang} bySize={bySize} />
    </div>
  )
}
