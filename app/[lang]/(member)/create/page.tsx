import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PixelCatDecoration } from "@/components/brand/PixelCatDecoration"
import { CreateInspiration } from "@/components/creations/CreateInspiration"
import { PixelNewForm } from "@/components/creations/PixelNewForm"
import { listPublishedCreations } from "@/features/creations/queries"
import { copy } from "../../../../lib/copy"
import { isLang } from "@/lib/i18n"
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
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-card p-5 shadow-sm sm:p-6">
        <PixelCatDecoration variant="drawing" size="lg" position="top-right" className="opacity-90" />
        <div className="relative z-[1] max-w-2xl pr-16 sm:pr-24">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#6355d8]">PXLB</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">
            {copy.createTitle[lang]}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{copy.createIntro[lang]}</p>
        </div>
      </header>

      <div className="mt-6 min-w-0">
        <PixelNewForm lang={lang} variant="dialog" />
      </div>

      <CreateInspiration lang={lang} bySize={bySize} />
    </div>
  )
}
