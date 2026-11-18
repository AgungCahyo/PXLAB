import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { SpaceBoard } from "@/components/canvas/SpaceBoard"
import { buttonClassName } from "@/components/ui/Button"
import { listActiveSpaceElements } from "@/features/space/queries"
import { getCurrentProfile } from "@/lib/auth/session"
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
    path: "/space",
    title: copy.spaceTitle,
    description: copy.spaceMeta,
  })
}

export default async function SpacePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  const lang = raw
  await connection()

  const [elements, profile] = await Promise.all([listActiveSpaceElements(), getCurrentProfile()])
  const member = profile ? { id: profile.id, username: profile.username ?? "member" } : null

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:px-16">
      <p className="pixel-kicker mb-3">{copy.spaceEyebrow[lang]}</p>
      <h1 className="pixel-title">{copy.spaceTitle[lang]}</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        {copy.spaceIntro[lang]}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href={href(lang, "/explore")} className={buttonClassName()}>
          {copy.landingExplore[lang]}
        </Link>
        <Link href={href(lang, "/create")} className={buttonClassName({ variant: "secondary" })}>
          {copy.landingCreate[lang]}
        </Link>
      </div>

      <section className="mt-16 border-t border-line pt-10" aria-labelledby="space-archive-heading">
        <p id="space-archive-heading" className="pixel-kicker mb-3">
          {copy.spaceLegacyKicker[lang]}
        </p>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{copy.spaceLegacyNote[lang]}</p>
        <div className="mt-8">
          <SpaceBoard lang={lang} elements={elements} member={member} />
        </div>
      </section>
    </div>
  )
}
