"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { memo, useCallback, useEffect, useRef, useState } from "react"
import { Comment, Share } from "pixelarticons/react"
import { PixelArt } from "@/components/creations/PixelArt"
import { CommentPanel, type FeedViewer } from "@/components/social/CommentPanel"
import { CreatorLine } from "@/components/social/CreatorLine"
import { PixelHeart } from "@/components/social/PixelHeart"
import { workActionBaseClass, workActionClass } from "@/components/social/socialAction"
import { useToast } from "@/components/social/Toast"
import { CreationShareDialog } from "@/components/share/CreationShareDialog"
import { toggleAppreciationAction } from "@/features/community/actions"
import type { FeedPostData } from "@/features/feed/queries"
import { displayTitle } from "@/lib/creations"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { reconcileDesiredState } from "@/lib/social-like"
import { cn } from "@/lib/utils"

function FeedPostBase({
  lang,
  post,
  viewer,
  loginNext,
}: {
  lang: Lang
  post: FeedPostData
  viewer: FeedViewer | null
  /** Current feed URL, so a guest returns to the same tab/page after sign-in. */
  loginNext?: string
}) {
  const t = socialCopy.feed
  const router = useRouter()
  const toast = useToast()
  const title = displayTitle(post.title, lang)
  const workHref = href(lang, `/creation/${post.id}`)

  // --- Like: optimistic, one request at a time (see reconcileDesiredState) ---
  const [liked, setLiked] = useState(post.liked)
  // Count excludes the viewer's own like, so the shown value is derived and can't drift.
  const [baseCount, setBaseCount] = useState(post.likeCount - (post.liked ? 1 : 0))
  const [popKey, setPopKey] = useState(0)
  const desiredRef = useRef(post.liked)
  const confirmedRef = useRef(post.liked)
  const syncingRef = useRef(false)
  const likeCount = baseCount + (liked ? 1 : 0)

  // A refreshed feed can arrive while a tap is in flight; ignore it until the
  // request settles, then adopt the fresh server snapshot.
  useEffect(() => {
    if (syncingRef.current) return
    desiredRef.current = post.liked
    confirmedRef.current = post.liked
    setLiked(post.liked)
    setBaseCount(post.likeCount - (post.liked ? 1 : 0))
  }, [post.liked, post.likeCount])

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      const outcome = await reconcileDesiredState({
        getDesired: () => desiredRef.current,
        getConfirmed: () => confirmedRef.current,
        setState: async (desired) => {
          const formData = new FormData()
          formData.set("creation_id", post.id)
          formData.set("desired", String(desired))
          const result = await toggleAppreciationAction(null, formData)
          if (!result || !("ok" in result)) return { ok: false }
          return {
            ok: true,
            state: result.liked ?? desired,
            count: result.count,
          }
        },
        onConfirmed: (state, count) => {
          confirmedRef.current = state
          setLiked(state)
          if (typeof count === "number") setBaseCount(count - (state ? 1 : 0))
        },
        onDesired: (state) => {
          desiredRef.current = state
        },
        onRollback: (confirmed) => {
          desiredRef.current = confirmed
          setLiked(confirmed)
        },
      })
      if (outcome === "rolled_back") toast(t.likeFailed[lang], "error")
    } finally {
      syncingRef.current = false
    }
  }, [post.id, toast, t.likeFailed, lang])

  function onLike() {
    if (!viewer) {
      router.push(loginHref(lang, loginNext ?? href(lang, "/home")))
      return
    }
    const next = !desiredRef.current
    desiredRef.current = next
    setLiked(next)
    if (next) setPopKey((key) => key + 1)
    void sync()
  }

  // --- Comments ---
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0)
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <article className="my-5 overflow-hidden rounded-3xl border border-slate-200/80 bg-card shadow-sm transition-all hover:border-slate-300 hover:shadow-md" aria-label={title}>
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <CreatorLine lang={lang} creator={post.author} at={post.published_at} />
      </div>

      <Link href={workHref} className="mt-3 block bg-slate-50" aria-label={title}>
        {post.cover_url ? (
          <PixelArt src={post.cover_url} alt={title} variant="thumb" framed={false} />
        ) : (
          <div className="aspect-square w-full bg-slate-100" />
        )}
      </Link>

      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px] leading-snug">
          <Link href={workHref} className="text-[15px] font-semibold text-fg transition-colors hover:text-[#6355d8]">
            {title}
          </Link>
          {post.isNew ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              {socialCopy.explore.newBadge[lang]}
            </span>
          ) : null}
          {post.caption ? (
            <p className="mt-1 w-full line-clamp-3 whitespace-pre-wrap text-[14px] leading-relaxed text-muted">{post.caption}</p>
          ) : null}
        </div>

        <div className="-ml-2 mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={`${liked ? t.unlike[lang] : t.like[lang]}, ${likeCount}`}
            className={cn(workActionBaseClass, liked ? "text-rose-500" : "text-fg")}
          >
            <span key={popKey} className={cn("inline-flex", liked && popKey > 0 && "soc-pop")}>
              <PixelHeart filled={liked} />
            </span>
            <span>{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMounted(true)
              setOpen((value) => !value)
            }}
            aria-expanded={open}
            aria-controls={`comments-${post.id}`}
            aria-label={`${t.comment[lang]}, ${commentCount}`}
            className={cn(workActionClass, open && "bg-slate-100 text-fg")}
          >
            <Comment width={22} height={22} aria-hidden="true" />
            <span>{commentCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            aria-label={t.share[lang]}
            className={workActionClass}
          >
            <Share width={22} height={22} aria-hidden="true" />
          </button>
        </div>
        <CreationShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          lang={lang}
          creationId={post.id}
          title={title}
          creatorLabel={
            post.author.displayName?.trim()
              ? `${post.author.displayName} · @${post.author.username}`
              : `@${post.author.username}`
          }
          coverUrl={post.cover_url}
          allowArtworkDownload={false}
          isPixel
        />

        <div inert={!open} id={`comments-${post.id}`} className="soc-expand mt-1" data-open={open}>
          <div>
            {mounted ? (
              <CommentPanel
                lang={lang}
                creationId={post.id}
                viewer={viewer}
                onTotal={setCommentCount}
                loginNext={loginNext}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

/** Memoised: appending a page must not re-render posts already on screen. */
export const FeedPost = memo(FeedPostBase)
