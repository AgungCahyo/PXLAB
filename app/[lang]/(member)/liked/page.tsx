import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { CollectionShell, FeedGrid } from "@/components/feeds/CollectionShell"
import { listLikedCreations } from "@/features/feeds/queries"
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
    path: "/liked",
    title: socialCopy.nav.liked[lang],
    description: socialCopy.feeds.likedDescription[lang],
    noIndex: true,
  })
}

export default async function LikedPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const items = await listLikedCreations()

  return (
    <CollectionShell
      title={socialCopy.feeds.likedTitle[lang]}
      description={socialCopy.feeds.likedDescription[lang]}
    >
      <FeedGrid lang={lang} items={items} />
    </CollectionShell>
  )
}
