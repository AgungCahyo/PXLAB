"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { Textarea } from "@/components/ui/Textarea"
import { ReportButton } from "@/components/community/ReportDialog"
import {
  addCommentAction,
  deleteCommentAction,
  editCommentAction,
  loadEarlierConversationAction,
  toggleAppreciationAction,
  type CommunityActionState,
  type PostedComment,
} from "@/features/community/actions"
import { forkCreationAction, type CreationActionState } from "@/features/creations/actions"
import type { ConversationNote, ConversationRoot } from "@/lib/conversation"
import { isCommentEdited, mergeConversation } from "@/lib/conversation"
import { copy } from "@/lib/copy"
import { formatRelativeTime } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { COMMENT_BODY_MAX } from "@/lib/site"
import { cn } from "@/lib/utils"

export function CreationCommunity({
  lang,
  creationId,
  source,
  roots,
  total,
  hasEarlier: initialHasEarlier,
  member,
  forkedFrom,
  allowFork = true,
}: {
  lang: Lang
  creationId: string
  /** Kept for call-site compatibility; engagement renders outside this section. */
  title?: string
  source: { id: string; title: string } | null
  roots: ConversationRoot[]
  total: number
  hasEarlier: boolean
  appreciateCount?: number
  appreciated?: boolean
  member: { id: string; username: string } | null
  forkedFrom: string | null
  allowFork?: boolean
}) {
  const [earlier, setEarlier] = useState<ConversationRoot[]>([])
  const [hasEarlier, setHasEarlier] = useState(initialHasEarlier)
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [pendingRoots, setPendingRoots] = useState<ConversationRoot[]>([])
  const [pendingReplies, setPendingReplies] = useState<ConversationNote[]>([])
  const [sendStatus, setSendStatus] = useState<Record<string, "sending" | "failed">>({})
  const retryingRef = useRef<Set<string>>(new Set())
  const [edits, setEdits] = useState<Record<string, { content: string; updated_at: string }>>({})
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  const thread = mergeConversation(earlier, roots, pendingRoots)
    .filter((root) => !removed.has(root.id))
    .map((root) => ({
      ...root,
      content: edits[root.id]?.content ?? root.content,
      updated_at: edits[root.id]?.updated_at ?? root.updated_at,
      replies: [
        ...root.replies,
        ...pendingReplies.filter(
          (reply) => reply.parent_id === root.id && !root.replies.some((item) => item.id === reply.id),
        ),
      ]
        .filter((reply) => !removed.has(reply.id))
        .map((reply) => ({
          ...reply,
          content: edits[reply.id]?.content ?? reply.content,
          updated_at: edits[reply.id]?.updated_at ?? reply.updated_at,
        })),
    }))

  const visibleCount = thread.reduce((sum, root) => sum + 1 + root.replies.length, 0)
  const headingCount = Math.max(total, visibleCount)

  function asNote(posted: PostedComment, fallback: ConversationNote): ConversationNote {
    return {
      ...fallback,
      id: posted.id,
      user_id: posted.user_id,
      creation_id: posted.creation_id,
      content: posted.content,
      parent_id: posted.parent_id,
      created_at: posted.created_at,
      updated_at: posted.updated_at,
      status: "published",
      author: { username: member?.username ?? "member", displayName: null },
    }
  }

  function onOptimistic(note: ConversationNote) {
    setSendStatus((current) => ({ ...current, [note.id]: "sending" }))
    if (note.parent_id) setPendingReplies((current) => [...current, note])
    else setPendingRoots((current) => [...current, { ...note, replies: [] }])
  }

  function clearSendStatus(tempId: string) {
    setSendStatus((current) => {
      if (!(tempId in current)) return current
      const next = { ...current }
      delete next[tempId]
      return next
    })
  }

  function onPosted(tempId: string, posted: PostedComment) {
    clearSendStatus(tempId)
    retryingRef.current.delete(tempId)
    if (posted.parent_id) {
      setPendingReplies((current) =>
        current.map((note) => (note.id === tempId ? asNote(posted, note) : note)),
      )
      setReplyingTo(null)
      return
    }
    setPendingRoots((current) =>
      current.map((root) => (root.id === tempId ? { ...asNote(posted, root), replies: root.replies } : root)),
    )
  }

  function onFailed(tempId: string) {
    retryingRef.current.delete(tempId)
    setSendStatus((current) => ({ ...current, [tempId]: "failed" }))
  }

  function discardFailed(tempId: string) {
    retryingRef.current.delete(tempId)
    clearSendStatus(tempId)
    setPendingRoots((current) => current.filter((root) => root.id !== tempId))
    setPendingReplies((current) => current.filter((note) => note.id !== tempId))
  }

  async function retryFailed(tempId: string) {
    if (retryingRef.current.has(tempId) || sendStatus[tempId] !== "failed") return
    const note =
      pendingRoots.find((root) => root.id === tempId) ??
      pendingReplies.find((reply) => reply.id === tempId)
    if (!note) return

    retryingRef.current.add(tempId)
    setSendStatus((current) => ({ ...current, [tempId]: "sending" }))
    const formData = new FormData()
    formData.set("creation_id", creationId)
    formData.set("content", note.content)
    if (note.parent_id) formData.set("parent_id", note.parent_id)

    const result = await addCommentAction(null, formData)
    if (result && "ok" in result && result.comment) {
      onPosted(tempId, result.comment)
      return
    }
    onFailed(tempId)
  }

  async function loadEarlier() {
    const oldest = thread[0]?.created_at
    if (!oldest || loadingEarlier) return
    setLoadingEarlier(true)
    try {
      const result = await loadEarlierConversationAction(creationId, oldest)
      setEarlier((current) => mergeConversation(result.roots, current, []))
      setHasEarlier(result.hasEarlier)
    } finally {
      setLoadingEarlier(false)
    }
  }

  return (
    <section className="mt-10 border-t border-line pt-8" aria-labelledby="conversation-heading">
      <h2 id="conversation-heading" className="pixel-title">
        {copy.commentsTitle[lang]}
        {headingCount > 0 ? ` (${headingCount})` : ""}
      </h2>
      {source ? (
        <p className="mt-3 text-[14px] text-muted">
          {copy.forkedFrom[lang]}{" "}
          <Link href={href(lang, `/creation/${source.id}`)} className="hover:text-fg">
            {source.title}
          </Link>
        </p>
      ) : forkedFrom ? (
        <p className="mt-3 text-[14px] text-muted">{copy.forkedUnavailable[lang]}</p>
      ) : null}

      {!member ? (
        <p className="mt-4 text-[14px] text-muted">
          {copy.commentSignIn[lang]}{" "}
          <Link
            href={loginHref(lang, href(lang, `/creation/${creationId}`))}
            className="underline hover:text-fg"
          >
            {copy.nav.signIn[lang]}
          </Link>
        </p>
      ) : null}

      {hasEarlier ? (
        <div className="mt-8">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={loadEarlier}
            disabled={loadingEarlier}
            aria-busy={loadingEarlier || undefined}
          >
            {loadingEarlier ? copy.conversationLoadingEarlier[lang] : copy.conversationLoadEarlier[lang]}
          </Button>
        </div>
      ) : null}

      {thread.length === 0 ? (
        <p className="mt-8 text-[15px] text-muted">{copy.commentsEmpty[lang]}</p>
      ) : (
        <ul className="mt-8">
          {thread.map((root) => (
            <li key={root.id} id={`comment-${root.id}`} className="border-b border-line py-5">
              <ConversationNoteRow
                lang={lang}
                note={root}
                member={member}
                canReply={Boolean(member) && !sendStatus[root.id]}
                sendStatus={sendStatus[root.id]}
                onReply={() => setReplyingTo(root.id)}
                onRetry={() => void retryFailed(root.id)}
                onDiscard={() => discardFailed(root.id)}
                onEdited={(content, updatedAt) =>
                  setEdits((current) => ({ ...current, [root.id]: { content, updated_at: updatedAt } }))
                }
                onDeleted={() =>
                  setRemoved((current) => {
                    const next = new Set(current)
                    next.add(root.id)
                    for (const reply of root.replies) next.add(reply.id)
                    return next
                  })
                }
              />
              {root.replies.map((reply) => (
                <div key={reply.id} id={`comment-${reply.id}`} className="mt-4 flex gap-3 pl-2 sm:pl-6">
                  <span className="mt-1 text-[13px] text-muted" aria-hidden>
                    ↳
                  </span>
                  <div className="min-w-0 flex-1">
                    <ConversationNoteRow
                      lang={lang}
                      note={reply}
                      member={member}
                      canReply={false}
                      sendStatus={sendStatus[reply.id]}
                      onRetry={() => void retryFailed(reply.id)}
                      onDiscard={() => discardFailed(reply.id)}
                      onEdited={(content, updatedAt) =>
                        setEdits((current) => ({
                          ...current,
                          [reply.id]: { content, updated_at: updatedAt },
                        }))
                      }
                      onDeleted={() =>
                        setRemoved((current) => {
                          const next = new Set(current)
                          next.add(reply.id)
                          return next
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              {member && replyingTo === root.id ? (
                <div className="mt-4 pl-2 sm:pl-6">
                  <ConversationComposer
                    lang={lang}
                    creationId={creationId}
                    member={member}
                    parentId={root.id}
                    replyTo={root.author.username}
                    collapsed={false}
                    initialContent={replyDrafts[root.id] ?? ""}
                    onContentChange={(value) =>
                      setReplyDrafts((current) => ({ ...current, [root.id]: value }))
                    }
                    onOptimistic={onOptimistic}
                    onPosted={(tempId, posted) => {
                      setReplyDrafts((current) => ({ ...current, [root.id]: "" }))
                      onPosted(tempId, posted)
                    }}
                    onFailed={onFailed}
                    onCancel={() => setReplyingTo(null)}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {member ? (
        <div className="mt-8">
          <ConversationComposer
            lang={lang}
            creationId={creationId}
            member={member}
            onOptimistic={onOptimistic}
            onPosted={onPosted}
            onFailed={onFailed}
          />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {member && allowFork ? <ForkForm lang={lang} creationId={creationId} /> : null}
        <ReportButton lang={lang} targetType="creation" targetId={creationId} member={Boolean(member)} />
      </div>
    </section>
  )
}

function PixelMark({ username }: { username: string }) {
  const letter = (username.trim()[0] ?? "?").toUpperCase()
  return (
    <span className="pixel-mark" aria-hidden>
      {letter}
    </span>
  )
}

function ConversationNoteRow({
  lang,
  note,
  member,
  canReply,
  sendStatus,
  onReply,
  onRetry,
  onDiscard,
  onEdited,
  onDeleted,
}: {
  lang: Lang
  note: ConversationNote
  member: { id: string; username: string } | null
  canReply: boolean
  sendStatus?: "sending" | "failed"
  onReply?: () => void
  onRetry?: () => void
  onDiscard?: () => void
  onEdited: (content: string, updatedAt: string) => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editDraft, setEditDraft] = useState<string | null>(null)
  const pendingLocal = Boolean(sendStatus)
  const own = Boolean(member && member.id === note.user_id) && !pendingLocal
  const edited = !pendingLocal && isCommentEdited(note.created_at, note.updated_at)

  return (
    <div
      className={cn("flex gap-3", sendStatus === "sending" && "opacity-80")}
      aria-busy={sendStatus === "sending" || undefined}
    >
      <PixelMark username={note.author.username} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted">
          <Link href={href(lang, `/u/${note.author.username}`)} className="hover:text-fg">
            @{note.author.username}
          </Link>
          {sendStatus === "sending"
            ? ` · ${copy.conversationSending[lang]}`
            : sendStatus === "failed"
              ? ` · ${copy.conversationSendFailed[lang]}`
              : ` · ${formatRelativeTime(note.created_at, lang)}`}
          {edited ? ` · ${copy.conversationEdited[lang]}` : ""}
        </p>
        {editing ? (
          <EditComment
            lang={lang}
            id={note.id}
            initial={editDraft ?? note.content}
            onCancel={(content) => {
              setEditDraft(content)
              setEditing(false)
            }}
            onSaved={(content) => {
              setEditDraft(null)
              onEdited(content, new Date().toISOString())
              setEditing(false)
            }}
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{note.content}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {sendStatus === "failed" ? (
            <>
              <Button type="button" size="sm" onClick={onRetry}>
                {copy.conversationRetry[lang]}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>
                {copy.conversationDiscard[lang]}
              </Button>
            </>
          ) : null}
          {canReply && onReply && !pendingLocal ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReply}>
              {copy.conversationReply[lang]}
            </Button>
          ) : null}
          {own && !editing ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {copy.conversationEdit[lang]}
            </Button>
          ) : null}
          {own ? <DeleteComment lang={lang} id={note.id} onDeleted={onDeleted} /> : null}
          {member && !pendingLocal ? (
            <ReportButton lang={lang} targetType="comment" targetId={note.id} member />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function ConversationComposer({
  lang,
  creationId,
  member,
  parentId,
  replyTo,
  collapsed = true,
  initialContent = "",
  onContentChange,
  onOptimistic,
  onPosted,
  onFailed,
  onCancel,
}: {
  lang: Lang
  creationId: string
  member: { id: string; username: string }
  parentId?: string
  replyTo?: string
  collapsed?: boolean
  initialContent?: string
  onContentChange?: (value: string) => void
  onOptimistic: (note: ConversationNote) => void
  onPosted: (tempId: string, posted: PostedComment) => void
  onFailed: (tempId: string) => void
  onCancel?: () => void
}) {
  const [open, setOpen] = useState(!collapsed)
  const [content, setContent] = useState(initialContent)
  const [error, setError] = useState<CommunityActionState>(null)
  const [pending, setPending] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        className="w-full border-[3px] border-earth bg-card px-3 py-3 text-left text-[15px] text-muted shadow-[4px_4px_0_0_var(--fg)] hover:bg-soft"
        onClick={() => setOpen(true)}
      >
        {copy.conversationPrompt[lang]}
      </button>
    )
  }

  async function submit(formData: FormData) {
    const body = String(formData.get("content") ?? "").trim()
    if (!body) return
    const tempId = `tmp-${crypto.randomUUID()}`
    const now = new Date().toISOString()
    onOptimistic({
      id: tempId,
      user_id: member.id,
      creation_id: creationId,
      content: body,
      status: "published",
      parent_id: parentId ?? null,
      created_at: now,
      updated_at: now,
      author: { username: member.username, displayName: null },
    })
    setPending(true)
    setError(null)
    const result = await addCommentAction(null, formData)
    setPending(false)
    if (result && "ok" in result && result.comment) {
      onPosted(tempId, result.comment)
      setContent("")
      if (!parentId) setOpen(false)
      else onCancel?.()
      return
    }
    // Keep the optimistic row (marked failed) and clear the field so content isn't duplicated.
    onFailed(tempId)
    setContent("")
    setError(result && "error" in result ? result : { error: "invalid_input" })
  }

  return (
    <form action={submit} className="grid gap-3">
      <input type="hidden" name="creation_id" value={creationId} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      {error && "error" in error ? <Alert tone="error">{copy.errors[error.error][lang]}</Alert> : null}
      <div className="flex gap-3">
        <PixelMark username={member.username} />
        <div className="min-w-0 flex-1">
          <Textarea
            id={parentId ? `reply-${parentId}` : "conversation-body"}
            name="content"
            required
            maxLength={COMMENT_BODY_MAX}
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
              onContentChange?.(event.target.value)
            }}
            label={
              parentId
                ? `${copy.conversationReplyTo[lang]} @${replyTo ?? ""}`
                : copy.conversationPrompt[lang]
            }
            className="min-h-24 sm:min-h-28"
          />
          <p className="mt-1 text-[13px] text-muted">
            {content.length}/{COMMENT_BODY_MAX}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || content.trim().length === 0}
          aria-busy={pending || undefined}
        >
          {pending ? copy.conversationSending[lang] : copy.conversationSend[lang]}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {copy.createCancel[lang]}
          </Button>
        ) : !parentId ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {copy.createCancel[lang]}
          </Button>
        ) : null}
      </div>
    </form>
  )
}

function EditComment({
  lang,
  id,
  initial,
  onCancel,
  onSaved,
}: {
  lang: Lang
  id: string
  initial: string
  onCancel: (content: string) => void
  onSaved: (content: string) => void
}) {
  const [content, setContent] = useState(initial)
  const [error, setError] = useState<CommunityActionState>(null)
  const [pending, setPending] = useState(false)

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await editCommentAction(null, formData)
    setPending(false)
    if (result && "ok" in result) {
      onSaved(String(formData.get("content") ?? "").trim())
      return
    }
    setError(result && "error" in result ? result : { error: "invalid_input" })
  }

  return (
    <form action={submit} className="mt-2 grid gap-2">
      <input type="hidden" name="id" value={id} />
      {error && "error" in error ? <Alert tone="error">{copy.errors[error.error][lang]}</Alert> : null}
      <Textarea
        id={`edit-${id}`}
        name="content"
        required
        maxLength={COMMENT_BODY_MAX}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        label={copy.conversationEdit[lang]}
        className="min-h-24"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || content.trim().length === 0}
          aria-busy={pending || undefined}
        >
          {pending ? copy.actionWorking[lang] : copy.conversationSave[lang]}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onCancel(content)}>
          {copy.createCancel[lang]}
        </Button>
      </div>
    </form>
  )
}

export function CreationEngagement({
  lang,
  creationId,
  title,
  appreciated,
  appreciateCount,
  member,
}: {
  lang: Lang
  creationId: string
  title: string
  appreciated: boolean
  appreciateCount: number
  member: { id: string; username: string } | null
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {member ? (
        <AppreciateForm
          lang={lang}
          creationId={creationId}
          appreciated={appreciated}
          count={appreciateCount}
        />
      ) : (
        <p className="inline-flex min-h-9 items-center gap-2 border-[3px] border-earth bg-card px-3 text-[13px] text-muted">
          <PixelIcon name="heart" />
          {copy.appreciate[lang]}
          {appreciateCount > 0 ? ` · ${appreciateCount}` : ""}
        </p>
      )}
      <ShareButton lang={lang} creationId={creationId} title={title} />
    </div>
  )
}

function AppreciateForm({
  lang,
  creationId,
  appreciated: initialAppreciated,
  count: initialCount,
}: {
  lang: Lang
  creationId: string
  appreciated: boolean
  count: number
}) {
  const [appreciated, setAppreciated] = useState(initialAppreciated)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<CommunityActionState>(null)
  const pendingRef = useRef(false)
  pendingRef.current = pending

  useEffect(() => {
    // Do not clobber an in-flight optimistic toggle with a stale RSC snapshot.
    if (pendingRef.current) return
    setAppreciated(initialAppreciated)
    setCount(initialCount)
  }, [initialAppreciated, initialCount])

  function toggle() {
    if (pendingRef.current) return
    const previous = { appreciated, count }
    const next = !appreciated
    // Commit the toggle to the DOM in this click turn so the user sees
    // active/inactive + count before the server round-trip starts.
    flushSync(() => {
      setAppreciated(next)
      setCount(Math.max(0, count + (next ? 1 : -1)))
      setPending(true)
      setError(null)
    })
    pendingRef.current = true

    const formData = new FormData()
    formData.set("creation_id", creationId)
    void toggleAppreciationAction(null, formData).then((result) => {
      pendingRef.current = false
      setPending(false)
      if (result && "error" in result) {
        flushSync(() => {
          setAppreciated(previous.appreciated)
          setCount(previous.count)
          setError(result)
        })
        return
      }
      // Keep optimistic values until props catch up after revalidate.
    })
  }

  return (
    <div>
      {error && "error" in error ? (
        <Alert tone="error" className="mb-2">
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={appreciated ? "secondary" : "outline"}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-pressed={appreciated}
        onClick={toggle}
        className={cn(
          // Keep the optimistic active look visible while the request runs.
          "disabled:opacity-100",
          appreciated && "shadow-[4px_4px_0_0_var(--fg)]",
        )}
      >
        <PixelIcon name="heart" />
        {appreciated ? copy.appreciated[lang] : copy.appreciate[lang]}
        {count > 0 ? ` · ${count}` : ""}
      </Button>
    </div>
  )
}

function ShareButton({
  lang,
  creationId,
  title,
}: {
  lang: Lang
  creationId: string
  title: string
}) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}${href(lang, `/creation/${creationId}`)}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // Fall through to clipboard when the share sheet is dismissed or unavailable.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={share}>
        <PixelIcon name="share" />
        {copy.share[lang]}
      </Button>
      {copied ? <span className="text-[13px] text-muted">{copy.shareCopied[lang]}</span> : null}
    </div>
  )
}

function ForkForm({ lang, creationId }: { lang: Lang; creationId: string }) {
  const [state, action, pending] = useActionState<CreationActionState, FormData>(
    forkCreationAction,
    null,
  )
  return (
    <form action={action}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="creation_id" value={creationId} />
      {state && "error" in state ? (
        <Alert tone="error" className="mb-2">
          {copy.errors[state.error][lang]}
        </Alert>
      ) : null}
      <Button type="submit" size="sm" variant="ghost" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.forkWorking[lang] : copy.fork[lang]}
      </Button>
    </form>
  )
}

function DeleteComment({
  lang,
  id,
  onDeleted,
}: {
  lang: Lang
  id: string
  onDeleted: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<CommunityActionState>(null)
  const [pending, setPending] = useState(false)

  if (!confirming) {
    return (
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        {copy.commentDelete[lang]}
      </Button>
    )
  }

  async function submit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await deleteCommentAction(null, formData)
    setPending(false)
    if (result && "ok" in result) {
      onDeleted()
      return
    }
    setError(result && "error" in result ? result : { error: "invalid_input" })
  }

  return (
    <form action={submit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {error && "error" in error ? <Alert tone="error">{copy.errors[error.error][lang]}</Alert> : null}
      <span className="text-[13px] text-muted">{copy.commentDeleteConfirm[lang]}</span>
      <Button type="submit" size="sm" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.createDeleting[lang] : copy.commentDelete[lang]}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        {copy.createCancel[lang]}
      </Button>
    </form>
  )
}
