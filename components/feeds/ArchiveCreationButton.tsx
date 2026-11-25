"use client"

import { useActionState } from "react"
import { Archive } from "pixelarticons/react"

import { setArchiveStateAction, type FeedActionState } from "@/features/feeds/actions"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function ArchiveCreationButton({
  lang,
  creationId,
  initialArchived = false,
  compact = false,
}: {
  lang: Lang
  creationId: string
  initialArchived?: boolean
  compact?: boolean
}) {
  const [state, action, pending] = useActionState<FeedActionState, FormData>(
    setArchiveStateAction,
    null,
  )
  const t = socialCopy.feeds
  const archived =
    state && "ok" in state && typeof state.archived === "boolean" ? state.archived : initialArchived
  const error = state && "error" in state ? state.error : null
  const label = archived ? t.unarchiveAction[lang] : t.archiveAction[lang]

  return (
    <form action={action} className={cn("inline-flex flex-col", compact && "items-start")}>
      <input type="hidden" name="creation_id" value={creationId} />
      <input type="hidden" name="desired" value={String(!archived)} />
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-card text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-fg disabled:opacity-60",
          compact ? "min-h-9 px-2.5" : "min-h-11 px-2.5",
        )}
      >
        <Archive width={compact ? 18 : 20} height={compact ? 18 : 20} aria-hidden="true" />
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
