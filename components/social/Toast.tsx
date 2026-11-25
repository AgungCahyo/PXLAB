"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { PixelIcon } from "@/components/ui/PixelIcon"
import { copy } from "../../lib/copy"
import { DEFAULT_LANG, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type ToastTone = "success" | "error" | "info"
type ToastItem = { id: number; message: string; tone: ToastTone }
type ShowToast = (message: string, tone?: ToastTone) => void

const ToastContext = createContext<ShowToast | null>(null)

const TOAST_MS = 2600

export function ToastProvider({ children, lang = DEFAULT_LANG }: { children: ReactNode; lang?: Lang }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timersRef = useRef<{ id: number; timer: number }[]>([])

  useEffect(
    () => () => {
      for (const entry of timersRef.current) window.clearTimeout(entry.timer)
    },
    [],
  )

  const show = useCallback<ShowToast>((message, tone = "success") => {
    const id = (nextId.current += 1)
    // Keep at most 2 visible; newest wins.
    setItems((prev) => [...prev.slice(-1), { id, message, tone }])
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((pending) => pending.timer !== timer)
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_MS)
    timersRef.current.push({ id, timer })
  }, [])

  /** Manual dismiss (U6): clears the pending timer so nothing leaks. */
  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.find((pending) => pending.id === id)?.timer
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timersRef.current = timersRef.current.filter((pending) => pending.timer !== timer)
    }
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "soc-toast pointer-events-auto flex max-w-sm items-center gap-3 px-4 py-2.5 text-[13px] font-medium shadow-[0_2px_0_0_rgb(0_0_0/0.25)]",
              item.tone === "error"
                ? "bg-brick text-fg"
                : item.tone === "info"
                  ? "bg-fg text-bg"
                  : "bg-grass text-fg",
            )}
          >
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={copy.toastDismiss[lang]}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center opacity-80 hover:opacity-100"
            >
              <PixelIcon name="close" className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** No-op outside the provider so components stay usable in isolation/tests. */
export function useToast(): ShowToast {
  return useContext(ToastContext) ?? (() => {})
}
