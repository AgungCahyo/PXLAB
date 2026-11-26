import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"

import { CreationCard } from "@/components/creations/CreationCard"
import { ArchiveCreationButton } from "@/components/feeds/ArchiveCreationButton"
import { CollectionShell, FeedGrid } from "@/components/feeds/CollectionShell"
import { listArchivedCreations } from "@/features/feeds/queries"
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
    path: "/archive",
    title: socialCopy.nav.archive[lang],
    description: socialCopy.feeds.archiveDescription[lang],
    noIndex: true,
  })
}

export default async function ArchivePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()
  const items = await listArchivedCreations()

  return (
    <CollectionShell
      title={socialCopy.feeds.archiveTitle[lang]}
      description={socialCopy.feeds.archiveDescription[lang]}
    >
      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              <CreationCard
                creation={item}
                lang={lang}
                showAuthor={false}
                footer={
                  <ArchiveCreationButton
                    lang={lang}
                    creationId={item.id}
                    initialArchived
                    compact
                    refreshOnChange
                    className="w-full justify-center"
                  />
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <FeedGrid lang={lang} items={[]} />
      )}
    </CollectionShell>
  )
}
