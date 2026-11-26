import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { connection } from "next/server"
import { Suspense } from "react"
import { CreationBody } from "@/components/creations/CreationBody"
import { CreationColorPalette } from "@/components/creations/CreationColorPalette"
import { CreationMoreMenu } from "@/components/creations/CreationMoreMenu"
import { CreationTags } from "@/components/creations/CreationTags"
import { CreatorBlock, CreatorOtherWorks } from "@/components/creations/CreatorBlock"
import { ConversationSkeleton } from "@/components/creations/PageSkeletons"
import { RecommendationSkeleton } from "@/components/creations/RecommendationRack"
import { RemixStrip } from "@/components/creations/RemixStrip"
import { SimilarWorksLazy } from "@/components/creations/SimilarWorksLazy"
import { CreationCommunity, CreationEngagement } from "@/components/community/CreationCommunity"
import { ArchiveCreationButton } from "@/components/feeds/ArchiveCreationButton"
import { SaveCreationButton } from "@/components/feeds/SaveCreationButton"
import { BackButton } from "@/components/ui/BackButton"
import { isFollowing } from "@/features/community/follows"
import { isCreationArchived, isCreationSaved } from "@/features/feeds/queries"
import { countCommentsOnCreation, getReactionSummary, listConversation } from "@/features/community/queries"
import {
  countPublishedRemixes,
  getPublishedCreation,
  listPublishedCreationsByUser,
  listPublishedRemixes,
} from "@/features/creations/queries"
import { getCurrentProfile } from "@/lib/auth/session"
import { displayTitle } from "@/lib/creations"
import { copy, creationCategoryLabels, creationTypeLabels } from "../../../../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { formatDayMonthYear } from "@/lib/format"
import { href, isLang, type Lang } from "@/lib/i18n"
import { pageMeta } from "@/lib/meta"
import { creationSocialPreviewPath } from "@/lib/share"
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
  const description = metaCaption
    ? `${metaCaption.slice(0, 120)} — @${creation.author.username}`
    : fallbackMeta
  const cacheBust = encodeURIComponent(creation.updated_at)
  const socialImage =
    creation.type === "pixel"
      ? `${creationSocialPreviewPath(creation.id)}?v=${cacheBust}`
      : creation.cover_url || undefined
  return pageMeta({
    lang,
    path: `/creation/${creation.id}`,
    title: displayTitle(creation.title, lang),
    description,
    image: socialImage,
    imageWidth: 1200,
    imageHeight: 630,
    ogType: "article",
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
    ? {
        id: profile.id,
        username: profile.username ?? "member",
        avatarUrl: profile.avatar_url,
      }
    : null
  const [reaction, remixCount, following, commentCount, saved, archived] = await Promise.all([
    getReactionSummary(creation.id, member?.id ?? null),
    creation.type === "pixel" ? countPublishedRemixes(creation.id) : Promise.resolve(0),
    profile && profile.id !== creation.user_id
      ? isFollowing(profile.id, creation.user_id)
      : Promise.resolve(false),
    countCommentsOnCreation(creation.id),
    isCreationSaved(creation.id),
    isCreationArchived(creation.id),
  ])
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
  const returnPath = `/creation/${creation.id}`

  const identity = (
    <>
      <h1 className="break-words text-[18px] font-semibold leading-snug tracking-[-0.015em] text-fg sm:text-[22px]">{title}</h1>
      {creation.source ? <RemixStrip lang={lang} items={[]} total={0} source={creation.source} /> : null}

      <div className="mt-3">
        <CreatorBlock
          lang={lang}
          author={creation.author}
          authorId={creation.user_id}
          otherWorks={[]}
          following={following}
          canFollow={!isOwner}
          member={Boolean(profile)}
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
        <p className="mt-4 max-w-prose whitespace-pre-wrap text-[14px] leading-relaxed text-muted">
          {creation.caption}
        </p>
      ) : null}

      <CreationTags lang={lang} tags={creation.tags} />
      {isPixel ? <CreationColorPalette lang={lang} usage={creation.color_usage} /> : null}

      <div className="mt-5 flex flex-wrap items-center gap-1 border-y border-line py-2">
        <CreationEngagement
          lang={lang}
          creationId={creation.id}
          title={title}
          creatorLabel={
            creation.author.displayName?.trim()
              ? `${creation.author.displayName} · @${creation.author.username}`
              : `@${creation.author.username}`
          }
          coverUrl={coverUrl}
          allowArtworkDownload={
            isPixel &&
            (isOwner || creation.allow_png_download)
          }
          isPixel={isPixel}
          appreciated={reaction.appreciated}
          appreciateCount={reaction.count}
          commentCount={commentCount}
          remixCount={remixCount}
          member={member}
          allowFork={!isOwner}
          editHref={isOwner ? href(lang, `/create/${creation.id}`) : null}
          editLabel={copy.createEditThis[lang]}
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

      {profile ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SaveCreationButton lang={lang} creationId={creation.id} initialSaved={saved} />
          {isOwner ? (
            <>
              <ArchiveCreationButton
                lang={lang}
                creationId={creation.id}
                initialArchived={archived}
              />
              <p className="w-full text-[12px] text-muted">{socialCopy.feeds.archivedNote[lang]}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )

  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-10">
      <BackButton
        fallbackHref={href(lang, "/explore")}
        label={copy.creationBack[lang]}
        className="mb-4"
      />

      {isPixel ? (
        <>
          <div className="detail-art-stage">
            <CreationBody
              type={creation.type}
              content={creation.content}
              lang={lang}
              coverUrl={coverUrl}
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

      <Suspense fallback={<RecommendationSkeleton />}>
        <CreatorOtherWorksSlot
          lang={lang}
          userId={creation.user_id}
          username={creation.author.username}
          excludeId={creation.id}
        />
      </Suspense>

      {!creation.source && remixCount > 0 ? (
        <Suspense fallback={<RecommendationSkeleton />}>
          <RemixStripSlot lang={lang} creationId={creation.id} />
        </Suspense>
      ) : null}

      {isPixel ? (
        <SimilarWorksLazy
          // Remount on detail change instead of resetting state in an effect.
          key={creation.id}
          lang={lang}
          creationId={creation.id}
          category={creation.category}
          tags={creation.tags}
        />
      ) : null}
    </article>
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

async function CreatorOtherWorksSlot({
  lang,
  userId,
  username,
  excludeId,
}: {
  lang: Lang
  userId: string
  username: string
  excludeId: string
}) {
  const result = await listPublishedCreationsByUser(userId, {
    excludeId,
    limit: 6,
    type: "pixel",
  })
  if (result.failed || result.items.length === 0) return null
  return <CreatorOtherWorks lang={lang} username={username} items={result.items} />
}

async function RemixStripSlot({
  lang,
  creationId,
}: {
  lang: Lang
  creationId: string
}) {
  const remixes = await listPublishedRemixes(creationId, 6)
  if (remixes.failed || remixes.items.length === 0) return null
  return <RemixStrip lang={lang} items={remixes.items} total={remixes.total} />
}
