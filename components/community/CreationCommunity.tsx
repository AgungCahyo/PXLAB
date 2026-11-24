"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Comment, Share } from "pixelarticons/react"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import { PixelHeart } from "@/components/social/PixelHeart"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { workActionBaseClass, workActionClass } from "@/components/social/socialAction"
import { Alert } from "@/components/ui/Alert"
import { socialButtonClass } from "@/components/social/socialButton"
import { Textarea } from "@/components/ui/Textarea"
import { ReportButton } from "@/components/community/ReportDialog"
import { CreationShareDialog } from "@/components/share/CreationShareDialog"
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
import { copy } from "../../lib/copy"
import { socialCopy } from "@/lib/copy-social"
import { formatRelativeTime } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { COMMENT_BODY_MAX } from "@/lib/site"
import { reconcileDesiredState } from "@/lib/social-like"
import { cn } from "@/lib/utils"

export type CommunityMember = {
  id: string
  username: string
  avatarUrl: string | null
}

function SocButton({
  variant = "ghost",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "solid" | "soft" | "brand"
}) {
  return <button className={socialButtonClass({ variant, size: "sm", className })} {...props} />
}

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
  prompt,
}: {
  lang: Lang
  creationId: string
  /** Kept for call-site compatibility; engagement renders outside this section. */
  title?: string
  source: { id: string; title: string; authorUsername?: string } | null
  roots: ConversationRoot[]
  total: number
  hasEarlier: boolean
  appreciateCount?: number
  appreciated?: boolean
  member: CommunityMember | null
  forkedFrom: string | null
  allowFork?: boolean
  /** Contextual root composer placeholder. */
  prompt?: string
}) {
  const composerPrompt = prompt ?? copy.conversationPrompt[lang]
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
      author: {
        username: member?.username ?? "member",
        displayName: null,
        avatarUrl: member?.avatarUrl ?? null,
      },
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
    <section
      id="creation-conversation"
      className="mt-8 border-t border-slate-200/80 pt-6"
      aria-labelledby="conversation-heading"
    >
      <h2 id="conversation-heading" className="text-[17px] font-semibold text-fg">
        {copy.commentsTitle[lang]}
        {headingCount > 0 ? <span className="ml-1 text-muted">({headingCount})</span> : ""}
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

      {hasEarlier ? (
        <div className="mt-8">
          <SocButton
            type="button"
            onClick={loadEarlier}
            disabled={loadingEarlier}
            aria-busy={loadingEarlier || undefined}
          >
            {loadingEarlier ? copy.conversationLoadingEarlier[lang] : copy.conversationLoadEarlier[lang]}
          </SocButton>
        </div>
      ) : null}

      {thread.length === 0 ? (
        <p className="mt-8 text-[15px] text-muted">{copy.commentsEmpty[lang]}</p>
      ) : (
        <ul className="mt-8">
          {thread.map((root) => (
            <li key={root.id} id={`comment-${root.id}`} className="border-b border-slate-100 py-5 last:border-b-0">
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

      <div className="mt-8">
        {member ? (
          <ConversationComposer
            lang={lang}
            creationId={creationId}
            member={member}
            prompt={composerPrompt}
            onOptimistic={onOptimistic}
            onPosted={onPosted}
            onFailed={onFailed}
          />
        ) : (
          <GuestConversationComposer lang={lang} creationId={creationId} prompt={composerPrompt} />
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {allowFork ? <ForkForm lang={lang} creationId={creationId} member={Boolean(member)} /> : null}
        <ReportButton lang={lang} targetType="creation" targetId={creationId} member={Boolean(member)} />
      </div>
    </section>
  )
}

function GuestConversationComposer({
  lang,
  creationId,
  prompt,
}: {
  lang: Lang
  creationId: string
  prompt: string
}) {
  const login = loginHref(lang, href(lang, `/creation/${creationId}`))
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
      <p className="text-[14px] leading-relaxed text-muted">{prompt}</p>
      <Link href={login} className={cn(socialButtonClass({ variant: "solid", size: "sm" }), "w-fit")}>
        {copy.conversationGuestPrompt[lang]}
      </Link>
    </div>
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
  member: CommunityMember | null
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
      <ProfileAvatar
        src={note.author.avatarUrl}
        alt={note.author.username}
        size="xs"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted">
          <Link href={href(lang, `/u/${note.author.username}`)} className="hover:text-fg">
            @{note.author.username}
          </Link>
          {sendStatus === "sending"
            ? ` · ${copy.conversationSending[lang]}`
            : sendStatus === "failed"
              ? ` · ${copy.conversationSendFailed[lang]}`
              : (
                  <>
                    {" · "}
                    <time dateTime={note.created_at}>{formatRelativeTime(note.created_at, lang)}</time>
                  </>
                )}
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
              <SocButton type="button" variant="solid" onClick={onRetry}>
                {copy.conversationRetry[lang]}
              </SocButton>
              <SocButton type="button" onClick={onDiscard}>
                {copy.conversationDiscard[lang]}
              </SocButton>
            </>
          ) : null}
          {canReply && onReply && !pendingLocal ? (
            <SocButton type="button" onClick={onReply}>
              {copy.conversationReply[lang]}
            </SocButton>
          ) : null}
          {own && !editing ? (
            <SocButton type="button" onClick={() => setEditing(true)}>
              {copy.conversationEdit[lang]}
            </SocButton>
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
  prompt,
  onContentChange,
  onOptimistic,
  onPosted,
  onFailed,
  onCancel,
}: {
  lang: Lang
  creationId: string
  member: CommunityMember
  parentId?: string
  replyTo?: string
  collapsed?: boolean
  initialContent?: string
  prompt?: string
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
  const rootPrompt = prompt ?? copy.conversationPrompt[lang]

  if (!open) {
    return (
      <button
        type="button"
        className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-left text-[14px] text-muted transition-colors hover:border-slate-300 hover:bg-white hover:text-fg"
        onClick={() => setOpen(true)}
      >
        {rootPrompt}
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
      author: {
        username: member.username,
        displayName: null,
        avatarUrl: member.avatarUrl,
      },
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
      {error && "error" in error ? (
        <Alert tone="error" flat>
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <div className="flex gap-3">
        <ProfileAvatar src={member.avatarUrl} alt={member.username} size="xs" />
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
            appearance="social"
            label={
              parentId
                ? `${copy.conversationReplyTo[lang]} @${replyTo ?? ""}`
                : rootPrompt
            }
            className="min-h-24 sm:min-h-28"
          />
          <p className="mt-1 text-[13px] text-muted">
            {content.length}/{COMMENT_BODY_MAX}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SocButton
          type="submit"
          variant="solid"
          disabled={pending || content.trim().length === 0}
          aria-busy={pending || undefined}
        >
          {pending ? copy.conversationSending[lang] : copy.conversationSend[lang]}
        </SocButton>
        {onCancel ? (
          <SocButton type="button" onClick={onCancel}>
            {copy.createCancel[lang]}
          </SocButton>
        ) : !parentId ? (
          <SocButton type="button" onClick={() => setOpen(false)}>
            {copy.createCancel[lang]}
          </SocButton>
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
      {error && "error" in error ? (
        <Alert tone="error" flat>
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <Textarea
        id={`edit-${id}`}
        name="content"
        required
        maxLength={COMMENT_BODY_MAX}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        label={copy.conversationEdit[lang]}
        appearance="social"
        className="min-h-24"
      />
      <div className="flex flex-wrap gap-2">
        <SocButton
          type="submit"
          variant="solid"
          disabled={pending || content.trim().length === 0}
          aria-busy={pending || undefined}
        >
          {pending ? copy.actionWorking[lang] : copy.conversationSave[lang]}
        </SocButton>
        <SocButton type="button" onClick={() => onCancel(content)}>
          {copy.createCancel[lang]}
        </SocButton>
      </div>
    </form>
  )
}

export function CreationEngagement({
  lang,
  creationId,
  title,
  creatorLabel,
  coverUrl = null,
  allowArtworkDownload = false,
  isPixel = true,
  appreciated,
  appreciateCount,
  commentCount = 0,
  remixCount = 0,
  member,
  allowFork = false,
  editHref = null,
  editLabel,
}: {
  lang: Lang
  creationId: string
  title: string
  creatorLabel: string
  coverUrl?: string | null
  allowArtworkDownload?: boolean
  isPixel?: boolean
  appreciated: boolean
  appreciateCount: number
  commentCount?: number
  remixCount?: number
  member: CommunityMember | null
  allowFork?: boolean
  editHref?: string | null
  editLabel?: string
}) {
  const t = socialCopy.feed
  const router = useRouter()

  return (
    <div className="-ml-2 flex flex-wrap items-center gap-1">
      {member ? (
        <AppreciateForm
          lang={lang}
          creationId={creationId}
          appreciated={appreciated}
          count={appreciateCount}
        />
      ) : (
        <button
          type="button"
          onClick={() => router.push(loginHref(lang, href(lang, `/creation/${creationId}`)))}
          aria-label={`${t.like[lang]}, ${appreciateCount}`}
          className={workActionClass}
        >
          <PixelHeart filled={false} />
          <span>{appreciateCount}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() =>
          document.getElementById("creation-conversation")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        aria-label={`${t.comment[lang]}, ${commentCount}`}
        className={workActionClass}
      >
        <Comment width={22} height={22} aria-hidden="true" />
        <span>{commentCount}</span>
      </button>
      <ShareButton
        lang={lang}
        creationId={creationId}
        title={title}
        creatorLabel={creatorLabel}
        coverUrl={coverUrl}
        allowArtworkDownload={allowArtworkDownload}
        isPixel={isPixel}
      />
      {editHref ? (
        <Link
          href={editHref}
          aria-label={editLabel}
          title={editLabel}
          className={workActionClass}
        >
          <PixelIcon name="pencil" />
        </Link>
      ) : null}
      {allowFork ? (
        <ForkForm lang={lang} creationId={creationId} member={Boolean(member)} remixCount={remixCount} />
      ) : remixCount > 0 ? (
        <span className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-muted">
          {copy.remixCount[lang].replace("{count}", String(remixCount))}
        </span>
      ) : null}
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
  const desiredRef = useRef(initialAppreciated)
  const confirmedRef = useRef(initialAppreciated)
  const baseCountRef = useRef(initialCount - (initialAppreciated ? 1 : 0))
  const syncingRef = useRef(false)

  useEffect(() => {
    // Do not clobber an in-flight optimistic toggle with a stale RSC snapshot.
    if (syncingRef.current) return
    desiredRef.current = initialAppreciated
    confirmedRef.current = initialAppreciated
    baseCountRef.current = initialCount - (initialAppreciated ? 1 : 0)
    setAppreciated(initialAppreciated)
    setCount(initialCount)
  }, [initialAppreciated, initialCount])

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      let rejected: CommunityActionState = null
      const outcome = await reconcileDesiredState({
        getDesired: () => desiredRef.current,
        getConfirmed: () => confirmedRef.current,
        setState: async (desired) => {
          const formData = new FormData()
          formData.set("creation_id", creationId)
          formData.set("desired", String(desired))
          const result = await toggleAppreciationAction(null, formData)
          if (!result || !("ok" in result)) {
            if (result && "error" in result) rejected = result
            return { ok: false }
          }
          return { ok: true, state: result.liked ?? desired, count: result.count }
        },
        onConfirmed: (state, serverCount) => {
          confirmedRef.current = state
          if (typeof serverCount === "number") baseCountRef.current = serverCount - (state ? 1 : 0)
          setAppreciated(state)
          setCount(baseCountRef.current + (state ? 1 : 0))
        },
        onDesired: (state) => {
          desiredRef.current = state
        },
        onRollback: (confirmed) => {
          desiredRef.current = confirmed
          setAppreciated(confirmed)
          setCount(baseCountRef.current + (confirmed ? 1 : 0))
        },
      })
      if (outcome === "rolled_back") {
        setError(rejected ?? { error: "invalid_input" })
      } else {
        setError(null)
      }
    } finally {
      syncingRef.current = false
      setPending(false)
    }
  }, [creationId])

  function toggle() {
    const next = !desiredRef.current
    // Commit the toggle to the DOM in this click turn so the user sees
    // active/inactive + count before the server round-trip starts.
    desiredRef.current = next
    flushSync(() => {
      setAppreciated(next)
      setCount(Math.max(0, baseCountRef.current + (next ? 1 : 0)))
      setPending(true)
      setError(null)
    })
    void sync()
  }

  return (
    <div>
      {error && "error" in error ? (
        <Alert tone="error" flat className="mb-2">
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <button
        type="button"
        aria-busy={pending || undefined}
        aria-pressed={appreciated}
        onClick={toggle}
        className={cn(
          workActionBaseClass,
          appreciated ? "text-brick" : "text-fg",
          "disabled:opacity-100",
        )}
      >
        <PixelHeart filled={appreciated} />
        <span>{count}</span>
      </button>
    </div>
  )
}

function ShareButton({
  lang,
  creationId,
  title,
  creatorLabel,
  coverUrl,
  allowArtworkDownload,
  isPixel,
}: {
  lang: Lang
  creationId: string
  title: string
  creatorLabel: string
  coverUrl: string | null
  allowArtworkDownload: boolean
  isPixel: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={socialCopy.feed.share[lang]}
        className={workActionClass}
      >
        <Share width={22} height={22} aria-hidden="true" />
      </button>
      <CreationShareDialog
        open={open}
        onClose={() => setOpen(false)}
        lang={lang}
        creationId={creationId}
        title={title}
        creatorLabel={creatorLabel}
        coverUrl={coverUrl}
        allowArtworkDownload={allowArtworkDownload}
        isPixel={isPixel}
      />
    </>
  )
}

function ForkForm({
  lang,
  creationId,
  member,
  remixCount = 0,
}: {
  lang: Lang
  creationId: string
  member: boolean
  remixCount?: number
}) {
  const [state, action, pending] = useActionState<CreationActionState, FormData>(
    forkCreationAction,
    null,
  )
  const label = pending
    ? copy.forkWorking[lang]
    : remixCount > 0
      ? `${copy.fork[lang]} · ${remixCount}`
      : copy.fork[lang]

  if (!member) {
    return (
      <Link
        href={loginHref(lang, href(lang, `/creation/${creationId}`))}
        className={workActionClass}
      >
        {copy.remixSignIn[lang]}
      </Link>
    )
  }

  return (
    <form action={action}>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="creation_id" value={creationId} />
      {state && "error" in state ? (
        <Alert tone="error" flat className="mb-2">
          {copy.errors[state.error][lang]}
        </Alert>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={workActionClass}
      >
        {label}
      </button>
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
      <SocButton type="button" onClick={() => setConfirming(true)}>
        {copy.commentDelete[lang]}
      </SocButton>
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
      {error && "error" in error ? (
        <Alert tone="error" flat>
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <span className="text-[13px] text-muted">{copy.commentDeleteConfirm[lang]}</span>
      <SocButton type="submit" variant="solid" disabled={pending} aria-busy={pending || undefined}>
        {pending ? copy.createDeleting[lang] : copy.commentDelete[lang]}
      </SocButton>
      <SocButton type="button" onClick={() => setConfirming(false)}>
        {copy.createCancel[lang]}
      </SocButton>
    </form>
  )
}
