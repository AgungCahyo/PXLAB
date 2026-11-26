"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "pixelarticons/react"

import { useToast } from "@/components/social/Toast"
import { setArchiveStateAction } from "@/features/feeds/actions"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { reconcileDesiredState } from "@/lib/social-like"
import { cn } from "@/lib/utils"

export function ArchiveCreationButton({
  lang,
  creationId,
  initialArchived = false,
  compact = false,
  refreshOnChange = false,
  className,
}: {
  lang: Lang
  creationId: string
  initialArchived?: boolean
  compact?: boolean
  refreshOnChange?: boolean
  className?: string
}) {
  const t = socialCopy.feeds
  const router = useRouter()
  const toast = useToast()
  const [archived, setArchived] = useState(initialArchived)
  const [errorCode, setErrorCode] = useState<"migration_required" | "unavailable" | null>(null)
  const desiredRef = useRef(initialArchived)
  const confirmedRef = useRef(initialArchived)
  const syncingRef = useRef(false)
  const lastErrorRef = useRef<"migration_required" | "unavailable" | null>(null)

  useEffect(() => {
    if (syncingRef.current) return
    desiredRef.current = initialArchived
    confirmedRef.current = initialArchived
    setArchived(initialArchived)
  }, [initialArchived])

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      const outcome = await reconcileDesiredState({
        getDesired: () => desiredRef.current,
        getConfirmed: () => confirmedRef.current,
        setState: async (desired) => {
          const formData = new FormData()
          formData.set("creation_id", creationId)
          formData.set("desired", String(desired))
          const result = await setArchiveStateAction(null, formData)
          if (!result || !("ok" in result)) {
            lastErrorRef.current =
              result && "error" in result && result.error === "migration_required"
                ? "migration_required"
                : "unavailable"
            return { ok: false }
          }
          lastErrorRef.current = null
          return { ok: true, state: result.archived ?? desired }
        },
        onConfirmed: (state) => {
          confirmedRef.current = state
          setArchived(state)
          setErrorCode(null)
          if (refreshOnChange) router.refresh()
        },
        onDesired: (state) => {
          desiredRef.current = state
        },
        onRollback: (confirmed) => {
          desiredRef.current = confirmed
          setArchived(confirmed)
        },
      })
      if (outcome === "rolled_back") {
        const code = lastErrorRef.current ?? "unavailable"
        setErrorCode(code)
        toast(code === "migration_required" ? t.migrationError[lang] : t.actionError[lang], "error")
      }
    } finally {
      syncingRef.current = false
    }
  }, [creationId, lang, refreshOnChange, router, t.actionError, t.migrationError, toast])

  function onToggle() {
    const next = !desiredRef.current
    desiredRef.current = next
    setArchived(next)
    setErrorCode(null)
    void sync()
  }

  const label = archived ? t.unarchiveAction[lang] : t.archiveAction[lang]

  return (
    <div className={cn("inline-flex flex-col", compact && "items-start", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={archived}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[2px] border text-[13px] font-medium transition-colors",
          archived
            ? "border-fg bg-fg text-bg"
            : "border-line bg-card text-muted hover:bg-soft hover:text-fg",
          compact ? "min-h-9 px-2.5" : "min-h-11 px-2.5",
          className,
        )}
      >
        <Archive width={compact ? 18 : 20} height={compact ? 18 : 20} aria-hidden="true" />
        <span>{label}</span>
      </button>
      {errorCode ? (
        <span role="status" className="mt-1 text-[12px] text-rose-600">
          {errorCode === "migration_required" ? t.migrationError[lang] : t.actionError[lang]}
        </span>
      ) : null}
    </div>
  )
}
