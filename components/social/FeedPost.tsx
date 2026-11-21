"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { memo, useCallback, useRef, useState } from "react"
import { Comment, Share } from "pixelarticons/react"
import { PixelArt } from "@/components/creations/PixelArt"
import { CommentPanel, type FeedViewer } from "@/components/social/CommentPanel"
import { CreatorLine } from "@/components/social/CreatorLine"
import { PixelHeart } from "@/components/social/PixelHeart"
import { useToast } from "@/components/social/Toast"
import { toggleAppreciationAction } from "@/features/community/actions"
import type { FeedPostData } from "@/features/feed/queries"
import { displayTitle } from "@/lib/creations"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { reconcileToggle } from "@/lib/social-like"
import { cn } from "@/lib/utils"

const ACTION =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 px-2 text-[14px] font-medium tabular-nums text-fg transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky"

function FeedPostBase({
  lang,
  post,
  viewer,
}: {
  lang: Lang
  post: FeedPostData
  viewer: FeedViewer | null
}) {
  const t = socialCopy.feed
  const router = useRouter()
  const toast = useToast()
  const title = displayTitle(post.title, lang)
  const workHref = href(lang, `/creation/${post.id}`)

  // --- Like: optimistic, one request at a time (see reconcileToggle) ---
  const [liked, setLiked] = useState(post.liked)
  const [popKey, setPopKey] = useState(0)
  const desiredRef = useRef(post.liked)
  const confirmedRef = useRef(post.liked)
  const syncingRef = useRef(false)
  // Count excludes the viewer's own like, so the shown value is derived and can't drift.
  const baseCount = post.likeCount - (post.liked ? 1 : 0)
  const likeCount = baseCount + (liked ? 1 : 0)

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      const outcome = await reconcileToggle({
        getDesired: () => desiredRef.current,
        getConfirmed: () => confirmedRef.current,
        setConfirmed: (value) => {
          confirmedRef.current = value
        },
        toggle: async () => {
          const formData = new FormData()
          formData.set("creation_id", post.id)
          const result = await toggleAppreciationAction(null, formData)
          return Boolean(result && "ok" in result)
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
      router.push(loginHref(lang, href(lang, "/home")))
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

  // --- Share: native sheet first, clipboard fallback, toast feedback ---
  async function onShare() {
    const url = `${window.location.origin}${workHref}`
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast(t.linkCopied[lang], "success")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return // user closed the sheet
      toast(t.copyFailed[lang], "error")
    }
  }

  return (
    <article className="py-4" aria-label={title}>
      <CreatorLine lang={lang} creator={post.author} at={post.published_at} />

      <Link href={workHref} className="mt-3 block bg-soft" aria-label={title}>
        {post.cover_url ? (
          <PixelArt src={post.cover_url} alt={title} variant="thumb" framed={false} />
        ) : (
          <div className="aspect-square w-full bg-soft" />
        )}
      </Link>

      <div className="-ml-2 mt-1 flex items-center gap-1">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={liked}
          aria-label={liked ? t.unlike[lang] : t.like[lang]}
          className={cn(ACTION, liked && "text-brick")}
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
          aria-label={t.comment[lang]}
          className={cn(ACTION, open && "bg-soft")}
        >
          <Comment width={22} height={22} aria-hidden="true" />
          <span>{commentCount}</span>
        </button>
        <button type="button" onClick={() => void onShare()} aria-label={t.share[lang]} className={ACTION}>
          <Share width={22} height={22} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-1 min-w-0 text-[14px] leading-snug">
        <Link href={workHref} className="font-semibold text-fg hover:underline">
          {title}
        </Link>
        {post.caption ? <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-muted">{post.caption}</p> : null}
      </div>

      <div id={`comments-${post.id}`} className="soc-expand mt-2" data-open={open}>
        <div>{mounted ? <CommentPanel lang={lang} creationId={post.id} viewer={viewer} onTotal={setCommentCount} /> : null}</div>
      </div>
    </article>
  )
}

/** Memoised: appending a page must not re-render posts already on screen. */
export const FeedPost = memo(FeedPostBase)
