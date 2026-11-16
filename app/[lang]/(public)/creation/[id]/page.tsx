import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { CreationBody } from "@/components/creations/CreationBody"
import { CreationCommunity, CreationEngagement } from "@/components/community/CreationCommunity"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { getReactionSummary, listConversation } from "@/features/community/queries"
import { getPublishedCreation } from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels, creationTypeLabels } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, isLang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { pixelCoverUrl } from "@/lib/site"
import { creationIdSchema } from "@/lib/validations/creation"

export const instant = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}): Promise<Metadata> {
  const { lang, id } = await params
  if (!isLang(lang) || !creationIdSchema.safeParse(id).success) return {}
  const creation = await getPublishedCreation(id)
  if (!creation) {
    return pageMeta({
      lang,
      path: `/creation/${id}`,
      title: copy.creationNotFound,
      description: copy.creationNotFound,
      noIndex: true,
    })
  }
  return pageMeta({
    lang,
    path: `/creation/${creation.id}`,
    title: displayTitle(creation.title, lang),
    description: copy.creationMeta,
    image:
      creation.type === "pixel"
        ? creation.cover_url || pixelCoverUrl(creation.id)
        : undefined,
  })
}

export default async function CreationDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang: raw, id } = await params
  if (!isLang(raw) || !creationIdSchema.safeParse(id).success) notFound()
  const lang = raw
  await connection()
  const creation = await getPublishedCreation(id)
  if (!creation) notFound()

  const profile = await getCurrentProfile()
  const [conversation, reaction] = await Promise.all([
    listConversation({ creationId: creation.id }),
    getReactionSummary(creation.id, profile?.id ?? null),
  ])

  const published = creation.published_at ?? creation.created_at
  const member = profile ? { id: profile.id, username: profile.username } : null
  const isOwner = profile?.id === creation.user_id
  const title = displayTitle(creation.title, lang)
  const coverUrl =
    creation.type === "pixel" ? creation.cover_url || pixelCoverUrl(creation.id) : creation.cover_url
  const isPixel = creation.type === "pixel"

  const meta = (
    <>
      <h1
        className={
          isPixel
            ? "mt-6 text-[22px] font-medium leading-snug sm:text-[24px]"
            : "pixel-title"
        }
      >
        {title}
      </h1>
      <p className="mt-3 text-[15px] text-muted">
        {copy.byAuthor[lang]}{" "}
        <Link href={href(lang, `/u/${creation.author.username}`)} className="hover:text-fg">
          @{creation.author.username}
        </Link>
        {published ? ` · ${formatDayMonthYear(published, lang)}` : ""}
        {creation.category
          ? ` · ${creationCategoryLabels[creation.category][lang]}`
          : ""}
      </p>
      {isOwner ? (
        <div className="mt-4">
          <Link
            href={href(lang, `/create/${creation.id}`)}
            className={buttonClassName({ size: "sm", variant: "secondary" })}
          >
            <PixelIcon name="pencil" />
            {copy.createEditThis[lang]}
          </Link>
        </div>
      ) : null}
      <div className="mt-5">
        <CreationEngagement
          lang={lang}
          creationId={creation.id}
          title={title}
          appreciated={reaction.appreciated}
          appreciateCount={reaction.count}
          member={member}
        />
      </div>
    </>
  )

  return (
    <article
      className={
        isPixel
          ? "mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16"
          : "mx-auto max-w-3xl px-5 py-16 sm:px-8 lg:px-16"
      }
    >
      {isPixel ? (
        <>
          <CreationBody
            type={creation.type}
            content={creation.content}
            lang={lang}
            coverUrl={coverUrl}
          />
          {meta}
        </>
      ) : (
        <>
          <p className="pixel-kicker mb-3">{creationTypeLabels[creation.type][lang]}</p>
          {meta}
          <div className="mt-10">
            <CreationBody
              type={creation.type}
              content={creation.content}
              lang={lang}
              coverUrl={coverUrl}
            />
          </div>
        </>
      )}

      <CreationCommunity
        lang={lang}
        creationId={creation.id}
        title={title}
        source={creation.source}
        forkedFrom={creation.forked_from}
        roots={conversation.roots}
        total={conversation.total}
        hasEarlier={conversation.hasEarlier}
        appreciateCount={reaction.count}
        appreciated={reaction.appreciated}
        member={member}
        allowFork={!isOwner}
      />
    </article>
  )
}
