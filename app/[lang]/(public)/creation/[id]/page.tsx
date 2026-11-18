import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { CreationBody } from "@/components/creations/CreationBody"
import { CreationColorPalette } from "@/components/creations/CreationColorPalette"
import { CreationMoreMenu } from "@/components/creations/CreationMoreMenu"
import { CreationTags } from "@/components/creations/CreationTags"
import { CreatorBlock, CreatorOtherWorks } from "@/components/creations/CreatorBlock"
import { ConversationSkeleton } from "@/components/creations/PageSkeletons"
import { RemixStrip } from "@/components/creations/RemixStrip"
import { SimilarWorksStrip } from "@/components/creations/SimilarWorksStrip"
import { CreationCommunity, CreationEngagement } from "@/components/community/CreationCommunity"
import { PageTransition } from "@/components/layout/PageTransition"
import { BackLink } from "@/components/ui/BackLink"
import { buttonClassName } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { isFollowing } from "@/features/community/follows"
import { getReactionSummary, listConversation } from "@/features/community/queries"
import {
  getPublishedCreation,
  listPublishedCreationsByUser,
  listPublishedRemixes,
  listSimilarCreations,
} from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels, creationTypeLabels } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { pixelCoverUrl } from "@/lib/site"
import { creationIdSchema, pixelContentSchema } from "@/lib/validations/creation"

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
  const metaCaption = creation.caption?.trim()
  const fallbackMeta = copy.creationMetaBy[lang].replace(
    "{username}",
    creation.author.username,
  )
  return pageMeta({
    lang,
    path: `/creation/${creation.id}`,
    title: displayTitle(creation.title, lang),
    description: metaCaption ? metaCaption.slice(0, 160) : fallbackMeta,
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
  const member = profile
    ? { id: profile.id, username: profile.username, avatarUrl: profile.avatar_url }
    : null
  const reaction = await getReactionSummary(creation.id, member?.id ?? null)
  const isOwner = profile?.id === creation.user_id
  const title = displayTitle(creation.title, lang)
  const published = creation.published_at ?? creation.created_at
  const coverUrl =
    creation.type === "pixel" ? creation.cover_url || pixelCoverUrl(creation.id) : creation.cover_url
  const isPixel = creation.type === "pixel"
  const pixelContent = isPixel ? pixelContentSchema.safeParse(creation.content) : null
  const pixelWidth = pixelContent?.success ? pixelContent.data.width : 64
  const pixelHeight = pixelContent?.success ? pixelContent.data.height : 64
  const sizeLabel = creation.category
    ? creationCategoryLabels[creation.category][lang]
    : null
  const conversationPrompt = sizeLabel
    ? copy.conversationPromptSize[lang].replace("{size}", sizeLabel)
    : copy.conversationPrompt[lang]
  const following =
    profile && profile.id !== creation.user_id
      ? await isFollowing(profile.id, creation.user_id)
      : false
  const returnPath = `/creation/${creation.id}`

  const [otherWorks, remixes, similar] = await Promise.all([
    listPublishedCreationsByUser(creation.user_id, {
      excludeId: creation.id,
      limit: 4,
      type: "pixel",
    }),
    isPixel ? listPublishedRemixes(creation.id, 4) : Promise.resolve({ items: [], total: 0, failed: false }),
    isPixel
      ? listSimilarCreations({
          id: creation.id,
          category: creation.category,
          tags: creation.tags,
          limit: 4,
        })
      : Promise.resolve({ items: [], failed: false }),
  ])

  const moreFromCreator = otherWorks.failed ? [] : otherWorks.items

  const identity = (
    <>
      <h1 className="page-heading-sans break-words">{title}</h1>
      {creation.source ? <RemixStrip lang={lang} items={[]} total={0} source={creation.source} /> : null}

      <div className="mt-4">
        <CreatorBlock
          lang={lang}
          author={creation.author}
          authorId={creation.user_id}
          otherWorks={[]}
          following={following}
          canFollow={!isOwner}
          returnPath={returnPath}
          publishedLabel={
            [published ? formatDayMonthYear(published, lang) : null, sizeLabel]
              .filter(Boolean)
              .join(" · ") || null
          }
          flush
        />
      </div>

      {creation.caption ? (
        <p className="mt-5 max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-fg">
          {creation.caption}
        </p>
      ) : null}

      <CreationTags lang={lang} tags={creation.tags} />
      {isPixel ? <CreationColorPalette lang={lang} usage={creation.color_usage} /> : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-5">
        {isOwner ? (
          <Link
            href={href(lang, `/create/${creation.id}`)}
            className={buttonClassName({ size: "sm", variant: "secondary" })}
          >
            <PixelIcon name="pencil" />
            {copy.createEditThis[lang]}
          </Link>
        ) : null}
        <CreationEngagement
          lang={lang}
          creationId={creation.id}
          title={title}
          appreciated={reaction.appreciated}
          appreciateCount={reaction.count}
          remixCount={remixes.total}
          member={member}
          allowFork={!isOwner}
        />
        {isPixel ? (
          <CreationMoreMenu
            lang={lang}
            creationId={creation.id}
            ownerId={creation.user_id}
            viewerId={profile?.id ?? null}
            status={creation.status}
            allowPngDownload={creation.allow_png_download}
            width={pixelWidth}
            height={pixelHeight}
            title={title}
          />
        ) : null}
      </div>
    </>
  )

  return (
    <PageTransition>
      <article
        className={
          isPixel
            ? "mx-auto w-full min-w-0 max-w-5xl px-5 py-6 sm:px-8 sm:py-8 lg:px-16"
            : "mx-auto w-full min-w-0 max-w-3xl px-5 py-10 sm:px-8 sm:py-12 lg:px-16"
        }
      >
        <BackLink href={href(lang, "/explore")} className="mb-5">
          {copy.creationBack[lang]}
        </BackLink>

        {isPixel ? (
          <>
            <div className="detail-art-stage">
              <CreationBody
                type={creation.type}
                content={creation.content}
                lang={lang}
                coverUrl={coverUrl}
                creationId={creation.id}
                priority
              />
            </div>
            <div className="mt-6 sm:mt-8">{identity}</div>
          </>
        ) : (
          <>
            <p className="pixel-kicker mb-3">{creationTypeLabels[creation.type][lang]}</p>
            {identity}
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

        <CreatorOtherWorks
          lang={lang}
          username={creation.author.username}
          items={moreFromCreator}
        />

        {!creation.source && remixes.total > 0 ? (
          <RemixStrip lang={lang} items={remixes.items} total={remixes.total} />
        ) : null}

        {isPixel && !similar.failed && similar.items.length > 0 ? (
          <SimilarWorksStrip lang={lang} items={similar.items} />
        ) : null}

        <Suspense fallback={<ConversationSkeleton />}>
          <CreationConversationSlot
            lang={lang}
            creationId={creation.id}
            title={title}
            source={creation.source}
            forkedFrom={creation.forked_from}
            member={member}
            prompt={conversationPrompt}
          />
        </Suspense>
      </article>
    </PageTransition>
  )
}

async function CreationConversationSlot({
  lang,
  creationId,
  title,
  source,
  forkedFrom,
  member,
  prompt,
}: {
  lang: Lang
  creationId: string
  title: string
  source: { id: string; title: string; authorUsername: string } | null
  forkedFrom: string | null
  member: { id: string; username: string; avatarUrl: string | null } | null
  prompt: string
}) {
  const conversation = await listConversation({ creationId })
  return (
    <CreationCommunity
      lang={lang}
      creationId={creationId}
      title={title}
      source={source}
      forkedFrom={forkedFrom}
      roots={conversation.roots}
      total={conversation.total}
      hasEarlier={conversation.hasEarlier}
      member={member}
      allowFork={false}
      prompt={prompt}
    />
  )
}
