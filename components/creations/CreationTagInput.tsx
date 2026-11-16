"use client"

import { useState, type KeyboardEvent } from "react"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { formatCreationTag, normalizeCreationTag } from "@/lib/creations"
import { copy } from "@/lib/copy"
import { type Lang } from "@/lib/i18n"
import { CREATION_TAGS_MAX } from "@/lib/site"

export function CreationTagInput({
  lang,
  id,
  name = "tags",
  value,
  onChange,
}: {
  lang: Lang
  id: string
  name?: string
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState("")
  const [invalid, setInvalid] = useState(false)
  const atLimit = value.length >= CREATION_TAGS_MAX

  const tryAdd = (raw: string) => {
    const parts = raw.split(",").map((part) => part.trim()).filter(Boolean)
    if (parts.length === 0) return
    let next = [...value]
    let rejected = false
    for (const part of parts) {
      if (next.length >= CREATION_TAGS_MAX) break
      const tag = normalizeCreationTag(part)
      if (!tag) {
        rejected = true
        continue
      }
      if (!next.includes(tag)) next = [...next, tag]
    }
    setInvalid(rejected)
    onChange(next)
    setDraft("")
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      if (!atLimit) tryAdd(draft)
      return
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1))
      setInvalid(false)
    }
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[14px] font-medium text-fg">
          {copy.createTagsLabel[lang]}
        </label>
        <span className="text-[12px] text-muted">
          {value.length}/{CREATION_TAGS_MAX}
        </span>
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 border-[3px] border-earth bg-bg px-2 py-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 border-[3px] border-earth bg-card px-1.5 py-0.5 text-[12px] text-fg"
          >
            {formatCreationTag(tag)}
            <button
              type="button"
              aria-label={copy.createTagRemove[lang].replace("{tag}", formatCreationTag(tag))}
              className="inline-flex h-6 w-6 items-center justify-center text-muted hover:text-fg"
              onClick={() => {
                onChange(value.filter((item) => item !== tag))
                setInvalid(false)
              }}
            >
              <PixelIcon name="close" className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          disabled={atLimit}
          placeholder={
            atLimit ? copy.createTagsFull[lang] : copy.createTagsPlaceholder[lang]
          }
          onChange={(event) => {
            setDraft(event.target.value)
            setInvalid(false)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim() && !atLimit) tryAdd(draft)
          }}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-[14px] text-fg outline-none placeholder:text-muted disabled:placeholder:text-muted"
        />
      </div>
      <input type="hidden" name={name} value={JSON.stringify(value)} />
      <p className="text-[13px] text-muted">{copy.createTagsHint[lang]}</p>
      {invalid ? (
        <p className="text-[13px] text-brick" role="alert">
          {copy.createTagInvalid[lang]}
        </p>
      ) : null}
    </div>
  )
}
