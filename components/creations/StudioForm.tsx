"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CreationBody } from "@/components/creations/CreationBody"
import { VisualEditor } from "@/components/creations/VisualEditor"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { Textarea } from "@/components/ui/Textarea"
import {
  deleteCreationAction,
  updateCreationAction,
  type CreationActionState,
} from "@/features/creations/actions"
import type { CreationRow } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import {
  CREATION_IDEA_BODY_MAX,
  CREATION_IDEA_CONTEXT_MAX,
  CREATION_STORY_BODY_MAX,
  CREATION_STORY_PROMPT_MAX,
  CREATION_TEXT_BODY_MAX,
  CREATION_TITLE_MAX,
} from "@/lib/site"
import type { IdeaContent, StoryContent, TextContent, VisualContent } from "@/lib/validations/creation"

export function StudioForm({ lang, creation }: { lang: Lang; creation: CreationRow }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const dirtyRef = useRef(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState<CreationActionState>(null)
  const [state, action, pending] = useActionState<CreationActionState, FormData>(
    updateCreationAction,
    null,
  )
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [title, setTitle] = useState(creation.title)
  const [textBody, setTextBody] = useState(
    "body" in creation.content ? creation.content.body : "",
  )
  const [context, setContext] = useState(
    "context" in creation.content ? creation.content.context : "",
  )
  const [prompt, setPrompt] = useState(
    "continuation_prompt" in creation.content ? creation.content.continuation_prompt : "",
  )
  const [visual, setVisual] = useState<VisualContent>(
    "elements" in creation.content ? creation.content : { version: 1, elements: [] },
  )

  const previewContent =
    creation.type === "visual"
      ? visual
      : creation.type === "idea"
        ? ({ version: 1, body: textBody, context } satisfies IdeaContent)
        : creation.type === "story"
          ? ({ version: 1, body: textBody, continuation_prompt: prompt } satisfies StoryContent)
          : ({ version: 1, body: textBody } satisfies TextContent)

  const touch = () => {
    dirtyRef.current = true
  }

  useEffect(() => {
    if (state && "ok" in state) dirtyRef.current = false
  }, [state])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  const leave = async () => {
    if (!dirtyRef.current) {
      router.push(href(lang, "/dashboard"))
      return
    }
    const form = formRef.current
    if (!form) return
    setLeaving(true)
    setLeaveError(null)
    const data = new FormData(form)
    data.set("intent", "draft")
    const result = await updateCreationAction(null, data)
    if (result && "error" in result) {
      setLeaveError(result)
      setLeaving(false)
      return
    }
    dirtyRef.current = false
    router.push(href(lang, "/dashboard"))
  }

  return (
    <form ref={formRef} action={action} className="grid gap-6">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="id" value={creation.id} />
      {creation.type === "visual" ? (
        <input type="hidden" name="content" value={JSON.stringify(visual)} />
      ) : null}
      <button
        type="button"
        onClick={() => void leave()}
        disabled={leaving || pending}
        className="inline-flex h-11 w-fit items-center gap-2 border-[3px] border-earth bg-card px-3 text-[14px] font-medium disabled:opacity-50"
      >
        <PixelIcon name="back" />
        {copy.createBackToWorks[lang]}
      </button>
      {leaveError && "error" in leaveError ? (
        <Alert tone="error">{copy.errors[leaveError.error][lang]}</Alert>
      ) : null}
      {state && "error" in state ? (
        <Alert tone="error">{copy.errors[state.error][lang]}</Alert>
      ) : null}
      {state && "ok" in state ? (
        <Alert tone="info">
          {state.unpublished
            ? copy.createUnpublished[lang]
            : state.published
              ? copy.createPublished[lang]
              : copy.createSaved[lang]}
        </Alert>
      ) : null}

      <p className="text-[12px] tracking-[0.16em] text-muted uppercase">
        {creation.status === "published" ? copy.createPublishedBadge[lang] : copy.createDraftBadge[lang]}
      </p>

      {preview ? (
        <div className="grid gap-4">
          <h2 className="pixel-title">{title}</h2>
          <CreationBody type={creation.type} content={previewContent} lang={lang} />
        </div>
      ) : null}
      <div className={preview ? "hidden" : "grid gap-6"}>
        <Input
          id="title"
          name="title"
          required
          maxLength={CREATION_TITLE_MAX}
          label={copy.createTitleLabel[lang]}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            touch()
          }}
        />
        {creation.type === "visual" ? (
          <VisualEditor
            lang={lang}
            value={visual}
            onChange={(value) => {
              setVisual(value)
              touch()
            }}
          />
        ) : (
          <>
            <Textarea
              id="body"
              name="body"
              required
              maxLength={
                creation.type === "idea"
                  ? CREATION_IDEA_BODY_MAX
                  : creation.type === "story"
                    ? CREATION_STORY_BODY_MAX
                    : CREATION_TEXT_BODY_MAX
              }
              label={copy.createBodyLabel[lang]}
              value={textBody}
              onChange={(event) => {
                setTextBody(event.target.value)
                touch()
              }}
            />
            {creation.type === "idea" ? (
              <Textarea
                id="context"
                name="context"
                maxLength={CREATION_IDEA_CONTEXT_MAX}
                label={copy.createContextLabel[lang]}
                value={context}
                onChange={(event) => {
                  setContext(event.target.value)
                  touch()
                }}
              />
            ) : null}
            {creation.type === "story" ? (
              <Textarea
                id="continuation_prompt"
                name="continuation_prompt"
                maxLength={CREATION_STORY_PROMPT_MAX}
                label={copy.createPromptLabel[lang]}
                hint={copy.createPromptHint[lang]}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  touch()
                }}
              />
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={() => setPreview((value) => !value)}>
          {preview ? copy.createEdit[lang] : copy.createPreview[lang]}
        </Button>
        {creation.status !== "published" ? (
          <Button type="submit" name="intent" value="draft" disabled={pending || leaving}>
            {copy.createSaveDraft[lang]}
          </Button>
        ) : null}
        <Button type="submit" name="intent" value="publish" disabled={pending || leaving}>
          {copy.createPublish[lang]}
        </Button>
        {creation.status === "published" ? (
          <Button type="submit" name="intent" value="unpublish" variant="outline" disabled={pending || leaving}>
            {copy.createUnpublish[lang]}
          </Button>
        ) : null}
        {creation.status === "published" ? (
          <a href={href(lang, `/creation/${creation.id}`)} className="inline-flex min-h-11 items-center text-[14px] text-muted hover:text-fg">
            {copy.createViewPublic[lang]}
          </a>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
          {copy.createDelete[lang]}
        </Button>
      </div>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={copy.createDelete[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <p className="text-[15px] text-muted">{copy.createDeleteConfirm[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={deleteCreationAction}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={creation.id} />
            <Button type="submit" variant="primary">
              {copy.createDelete[lang]}
            </Button>
          </form>
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>
    </form>
  )
}
