import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { PlaygroundForm } from "@/components/creations/PlaygroundForm"
import { StudioForm } from "@/components/creations/StudioForm"
import { getOwnedCreation, loadOwnedPixelSource } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
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
    return (
      <PlaygroundForm
        lang={raw}
        creation={creation}
        initialSource={pixel.source}
        loadBroken={pixel.broken}
      />
    )
  }

  return (
    <div data-chrome="studio" className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-16">
      <p className="pixel-kicker mb-3">
        {copy.createEyebrow[raw]}
      </p>
      <h1 className="pixel-title">{copy.createTitle[raw]}</h1>
      <div className="mt-10">
        <StudioForm lang={raw} creation={creation} />
      </div>
    </div>
  )
}
