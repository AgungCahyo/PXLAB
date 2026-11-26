"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { PixelBookmark } from "@/components/social/PixelBookmark"
import { useToast } from "@/components/social/Toast"
import { setSavedStateAction } from "@/features/feeds/actions"
import { socialCopy } from "@/lib/copy-social"
import type { Lang } from "@/lib/i18n"
import { reconcileDesiredState } from "@/lib/social-like"
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
  const t = socialCopy.feeds
  const toast = useToast()
  const [saved, setSaved] = useState(initialSaved)
  const [errorCode, setErrorCode] = useState<"migration_required" | "unavailable" | null>(null)
  const desiredRef = useRef(initialSaved)
  const confirmedRef = useRef(initialSaved)
  const syncingRef = useRef(false)
  const lastErrorRef = useRef<"migration_required" | "unavailable" | null>(null)

  useEffect(() => {
    if (syncingRef.current) return
    desiredRef.current = initialSaved
    confirmedRef.current = initialSaved
    setSaved(initialSaved)
  }, [initialSaved])

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
          const result = await setSavedStateAction(null, formData)
          if (!result || !("ok" in result)) {
            lastErrorRef.current =
              result && "error" in result && result.error === "migration_required"
                ? "migration_required"
                : "unavailable"
            return { ok: false }
          }
          lastErrorRef.current = null
          return { ok: true, state: result.saved ?? desired }
        },
        onConfirmed: (state) => {
          confirmedRef.current = state
          setSaved(state)
          setErrorCode(null)
        },
        onDesired: (state) => {
          desiredRef.current = state
        },
        onRollback: (confirmed) => {
          desiredRef.current = confirmed
          setSaved(confirmed)
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
  }, [creationId, lang, t.actionError, t.migrationError, toast])

  function onToggle() {
    const next = !desiredRef.current
    desiredRef.current = next
    setSaved(next)
    setErrorCode(null)
    void sync()
  }

  const label = saved ? t.saved[lang] : t.save[lang]

  return (
    <div className="inline-flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-[2px] border px-2.5 text-[13px] font-medium transition-colors",
          saved
            ? "border-[#ff4f00] bg-primary-soft text-[#ff4f00]"
            : "border-line bg-card text-muted hover:bg-soft hover:text-fg",
        )}
      >
        <PixelBookmark filled={saved} size={20} />
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
