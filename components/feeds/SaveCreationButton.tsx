"use client"

import { useActionState } from "react"
import { Bookmark } from "pixelarticons/react"

import { setSavedStateAction, type FeedActionState } from "@/features/feeds/actions"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function SaveCreationButton({
  lang,
  creationId,
  initialSaved,
}: {
  lang: Lang
  creationId: string
  initialSaved: boolean
}) {
  const [state, action, pending] = useActionState<FeedActionState, FormData>(
    setSavedStateAction,
    null,
  )
  const t = socialCopy.feeds
  const saved = state && "ok" in state && typeof state.saved === "boolean" ? state.saved : initialSaved
  const error = state && "error" in state ? state.error : null
  const label = saved ? t.saved[lang] : t.save[lang]

  return (
    <form action={action} className="inline-flex flex-col">
      <input type="hidden" name="creation_id" value={creationId} />
      <input type="hidden" name="desired" value={String(!saved)} />
      <button
        type="submit"
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-2.5 text-[13px] font-medium transition-colors disabled:opacity-60",
          saved
            ? "border-purple-200 bg-purple-50 text-[#6355d8]"
            : "border-slate-200 bg-card text-slate-600 hover:bg-slate-50 hover:text-fg",
        )}
      >
        <Bookmark width={20} height={20} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {error ? (
        <span role="status" className="mt-1 text-[12px] text-rose-600">
          {error === "migration_required" ? t.migrationError[lang] : t.actionError[lang]}
        </span>
      ) : null}
    </form>
  )
}
