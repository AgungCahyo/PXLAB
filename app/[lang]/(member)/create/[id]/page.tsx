import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PlaygroundForm } from "../../../../../components/creations/PlaygroundForm"
import { StudioForm } from "@/components/creations/StudioForm"
import { PageHeader } from "@/components/ui/PageHeader"
import { getOwnedCreation, getPublishedCreation, loadOwnedPixelSource } from "@/features/creations/queries"
import { displayTitle } from "@/lib/creations"
import { copy } from "../../../../../lib/copy"
import { isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { creationIdSchema } from "@/lib/validations/creation"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
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

export default async function EditCreationPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang: raw, id } = await params
  if (!isLang(raw) || !creationIdSchema.safeParse(id).success) notFound()
  await connection()
  const creation = await getOwnedCreation(id)
  if (!creation) notFound()

  const pixel =
    creation.type === "pixel" ? await loadOwnedPixelSource(creation) : { source: null, broken: false }

  if (creation.type === "pixel") {
    const remixParent =
      creation.forked_from ? await getPublishedCreation(creation.forked_from) : null
    return (
      <PlaygroundForm
        lang={raw}
        creation={creation}
        initialSource={pixel.source}
        loadBroken={pixel.broken}
        remixOf={
          remixParent
            ? {
                id: remixParent.id,
                title: remixParent.title,
                authorUsername: remixParent.author.username,
              }
            : null
        }
      />
    )
  }

  return (
    <div data-chrome="studio" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-16">
      <PageHeader title={copy.createEdit[raw]} intro={displayTitle(creation.title, raw)} />
      <div className="mt-10">
        <StudioForm lang={raw} creation={creation} />
      </div>
    </div>
  )
}
