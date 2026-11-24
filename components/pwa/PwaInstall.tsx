"use client"

import { Download, Share, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  isIosSafari,
  isStandaloneDisplay,
  readInstallDismissed,
  writeInstallDismissed,
} from "@/lib/pwa"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type Props = {
  lang: Lang
  /** Compact banner (home/explore). Settings uses variant="panel". */
  variant?: "banner" | "panel"
  className?: string
}

export function PwaInstall({ lang, variant = "banner", className }: Props) {
  const [standalone, setStandalone] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(true)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<"idle" | "accepted" | "dismissed">("idle")

  useEffect(() => {
    setStandalone(isStandaloneDisplay())
    setDismissed(readInstallDismissed())
    setIosHint(isIosSafari() && !isStandaloneDisplay())

    const onBip = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", onBip)

    const onInstalled = () => {
      setDeferred(null)
      setStandalone(true)
      setStatus("accepted")
      writeInstallDismissed(true)
    }
    window.addEventListener("appinstalled", onInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (standalone) {
    if (variant === "panel") {
      return (
        <p className={cn("text-[13px] text-muted", className)} role="status">
          {copy.pwaInstalled[lang]}
        </p>
      )
    }
    return null
  }

  const canNativeInstall = Boolean(deferred)
  const showBanner = variant === "banner" && !dismissed && (canNativeInstall || iosHint)
  const showPanel = variant === "panel"

  if (variant === "banner" && !showBanner) return null
  if (variant === "panel" && !showPanel) return null

  async function install() {
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === "accepted") {
        setStatus("accepted")
        writeInstallDismissed(true)
        setDeferred(null)
      } else {
        setStatus("dismissed")
        // Soft dismiss — do not claim success.
        writeInstallDismissed(false)
        setDismissed(true)
      }
    } catch {
      setStatus("dismissed")
    } finally {
      setBusy(false)
    }
  }

  function dismiss(forever = false) {
    writeInstallDismissed(forever)
    setDismissed(true)
  }

  if (variant === "panel") {
    return (
      <div className={cn("grid gap-3", className)}>
        {canNativeInstall ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void install()}
          >
            <Download className="size-4" strokeWidth={2.25} />
            {copy.pwaInstallAction[lang]}
          </Button>
        ) : null}
        {iosHint ? (
          <p className="text-[13px] text-muted">
            <Share className="mr-1 inline size-3.5 align-text-bottom" strokeWidth={2.25} />
            {copy.pwaIosHint[lang]}
          </p>
        ) : null}
        {!canNativeInstall && !iosHint ? (
          <p className="text-[13px] text-muted">{copy.pwaUnavailable[lang]}</p>
        ) : null}
        {status === "accepted" ? (
          <p className="text-[13px] text-muted" role="status">
            {copy.pwaInstallAccepted[lang]}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-40 px-3",
        "bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-[max(1rem,env(safe-area-inset-bottom,0px))]",
        className,
      )}
      role="region"
      aria-label={copy.pwaInstallTitle[lang]}
    >
      <div className="mx-auto flex max-w-lg items-start gap-3 border-[3px] border-earth bg-card p-3 shadow-[4px_4px_0_0_var(--fg)]">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-fg">{copy.pwaInstallTitle[lang]}</p>
          {iosHint && !canNativeInstall ? (
            <p className="mt-1 text-[12px] text-muted">{copy.pwaIosHint[lang]}</p>
          ) : (
            <p className="mt-1 text-[12px] text-muted">{copy.pwaInstallHint[lang]}</p>
          )}
          {canNativeInstall ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={busy}
              onClick={() => void install()}
            >
              <Download className="size-4" strokeWidth={2.25} />
              {copy.pwaInstallAction[lang]}
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex size-9 shrink-0 items-center justify-center border-[3px] border-transparent text-muted hover:border-earth hover:text-fg"
          aria-label={copy.pwaDismiss[lang]}
          onClick={() => dismiss(false)}
        >
          <X className="size-4" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}
