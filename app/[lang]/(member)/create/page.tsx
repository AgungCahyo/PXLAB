import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PixelCatDecoration } from "@/components/brand/PixelCatDecoration"
import { CreateInspiration } from "@/components/creations/CreateInspiration"
import { NewArtworkRouteDialog } from "@/components/creations/NewArtworkDialog"
import { listPublishedCreations } from "@/features/creations/queries"
import { copy } from "../../../../lib/copy"
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
      <header className="relative border-b border-line pb-6">
        <PixelCatDecoration variant="drawing" size="lg" position="top-right" className="opacity-90" />
        <div className="relative z-[1] max-w-2xl pr-16 sm:pr-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">PXLB</p>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight text-fg sm:text-[30px]">
            {copy.createTitle[lang]}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">{copy.createIntro[lang]}</p>
          <div className="mt-3">
            <Link href={href(lang, "/dashboard")} className="text-[13px] font-medium text-[#ff4f00] hover:underline">
              {copy.createManageLink[lang]} →
            </Link>
          </div>
        </div>
      </header>

      <div className="mt-6 min-w-0">
        <NewArtworkRouteDialog lang={lang} />
      </div>

      <CreateInspiration lang={lang} bySize={bySize} />
    </div>
  )
}
