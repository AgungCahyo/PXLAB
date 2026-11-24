"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { PixelCat } from "@/components/brand/PixelCat"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { socialButtonClass } from "@/components/social/socialButton"
import { addCommentAction } from "@/features/community/actions"
import { loadPostCommentsAction } from "@/features/feed/actions"
import type { AvatarConfig } from "@/lib/avatar-gen"
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import type { ConversationNote, ConversationRoot } from "@/lib/conversation"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { COMMENT_BODY_MAX } from "@/lib/site"
import { formatRelativeTime } from "@/lib/social-time"
import { useToast } from "@/components/social/Toast"

export type FeedViewer = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  avatarConfig: AvatarConfig | null
}

function Note({ note, lang, nested = false }: { note: ConversationNote; lang: Lang; nested?: boolean }) {
  const name = note.author.displayName || note.author.username
  return (
    <div className={nested ? "ml-9 flex gap-2.5 pt-2" : "flex gap-2.5 pt-3"}>
      <ProfileAvatar
        src={note.author.avatarUrl}
        userId={note.user_id}
        alt=""
        size="xs"
      />
      <div className="min-w-0 flex-1 text-[14px] leading-snug">
        <p className="break-words">
          <Link href={href(lang, `/u/${note.author.username}`)} className="font-semibold text-fg hover:underline">
            {name}
          </Link>{" "}
          <span className="whitespace-pre-wrap text-fg">{note.content}</span>
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          <time dateTime={note.created_at}>{formatRelativeTime(note.created_at, lang)}</time>
        </p>
      </div>
    </div>
  )
}

/**
 * Inline comments for the feed. Reads with the same query as the creation page and posts
 * through the existing addCommentAction. Threads/edit/delete stay on the creation page.
 */
export function CommentPanel({
  lang,
  creationId,
  viewer,
  onTotal,
  loginNext,
}: {
  lang: Lang
  creationId: string
  viewer: FeedViewer | null
  onTotal: (total: number) => void
  /** Preserves the feed tab/page across guest sign-in. */
  loginNext?: string
}) {
  const t = socialCopy.feed
  const toast = useToast()
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [roots, setRoots] = useState<ConversationRoot[]>([])
  const [total, setTotal] = useState(0)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const onTotalRef = useRef(onTotal)

  useEffect(() => {
    onTotalRef.current = onTotal
  }, [onTotal])

  const load = useCallback(async () => {
    setState("loading")
    const result = await loadPostCommentsAction(creationId)
    if (!result.ok) {
      setState("error")
      return
    }
    setRoots(result.roots)
    setTotal(result.total)
    onTotalRef.current(result.total)
    setState("ready")
  }, [creationId])

  useEffect(() => {
    // Deferred: keeps the initial fetch out of the effect body's synchronous path.
    const id = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(id)
  }, [load])

  async function submit() {
    const content = draft.trim()
    if (!viewer || !content || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    try {
      const formData = new FormData()
      formData.set("creation_id", creationId)
      formData.set("content", content)
      const result = await addCommentAction(null, formData)
      if (result && "ok" in result && result.comment) {
        const posted = result.comment
        const note: ConversationRoot = {
          id: posted.id,
          user_id: posted.user_id,
          creation_id: posted.creation_id,
          content: posted.content,
          status: "published",
          parent_id: null,
          created_at: posted.created_at,
          updated_at: null,
          author: {
            username: viewer.username ?? "member",
            displayName: viewer.displayName,
            avatarUrl: viewer.avatarUrl,
          },
          replies: [],
        }
        setRoots((prev) => [...prev, note])
        const nextTotal = total + 1
        setTotal(nextTotal)
        onTotalRef.current(nextTotal)
        setDraft("")
      } else if (result && "error" in result) {
        toast(copy.errors[result.error][lang], "error")
      } else {
        toast(copy.errors.invalid_input[lang], "error")
      }
    } catch {
      toast(copy.errors.invalid_input[lang], "error")
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  return (
    <div className="px-0.5 pb-2">
      {state === "loading" ? (
        <p className="py-4 text-[13px] text-muted" role="status">
          {t.loadingComments[lang]}
        </p>
      ) : null}

      {state === "error" ? (
        <div className="flex flex-col items-start gap-2 py-4" role="alert">
          <p className="text-[13px] text-muted">{t.commentsLoadFailed[lang]}</p>
          <button type="button" onClick={() => void load()} className={socialButtonClass({ variant: "soft", size: "sm" })}>
            {socialCopy.explore.retry[lang]}
          </button>
        </div>
      ) : null}

      {state === "ready" && roots.length === 0 ? (
        <div className="py-4">
          <div className="flex justify-center" aria-hidden="true">
            <PixelCat variant="peeking" size="sm" animated />
          </div>
          <SocialEmptyState
            className="!py-3"
            title={t.noComments[lang]}
            description={t.noCommentsHint[lang]}
          />
        </div>
      ) : null}

      {state === "ready" && roots.length > 0 ? (
        <ul className="max-h-80 overflow-y-auto pb-1">
          {roots.map((root) => (
            <li key={root.id}>
              <Note note={root} lang={lang} />
              {root.replies.map((reply) => (
                <Note key={reply.id} note={reply} lang={lang} nested />
              ))}
            </li>
          ))}
        </ul>
      ) : null}

      {state === "ready" && total > roots.length ? (
        <Link
          href={href(lang, `/creation/${creationId}`)}
          className="inline-flex min-h-11 items-center text-[13px] text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t.viewAll[lang]}
        </Link>
      ) : null}

      {viewer ? (
        <div className="mt-2 flex items-end gap-2 border-t border-[color:var(--soc-hairline)] pt-3">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t.commentLabel[lang]}</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault()
                  void submit()
                }
              }}
              maxLength={COMMENT_BODY_MAX}
              rows={1}
              enterKeyHint="send"
              placeholder={t.commentPlaceholder[lang]}
              className="block max-h-32 min-h-11 w-full resize-none border border-transparent bg-soft px-3 py-2.5 text-[14px] text-fg placeholder:text-muted focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
            />
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={sending || draft.trim().length === 0}
            className={socialButtonClass({ variant: "solid", className: "shrink-0" })}
          >
            {sending ? t.sending[lang] : t.send[lang]}
          </button>
        </div>
      ) : (
        <Link
          href={loginHref(lang, loginNext ?? href(lang, "/home"))}
          className={socialButtonClass({ variant: "soft", className: "mt-2 w-full" })}
        >
          {t.signInToComment[lang]}
        </Link>
      )}
    </div>
  )
}
