"use client"

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

type ToastTone = "success" | "error" | "info"
type ToastItem = { id: number; message: string; tone: ToastTone }
type ShowToast = (message: string, tone?: ToastTone) => void

const ToastContext = createContext<ShowToast | null>(null)

const TOAST_MS = 2600

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback<ShowToast>((message, tone = "success") => {
    const id = (nextId.current += 1)
    // Keep at most 2 visible; newest wins.
    setItems((prev) => [...prev.slice(-1), { id, message, tone }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), TOAST_MS)
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
              "soc-toast pointer-events-auto max-w-sm px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_2px_0_0_rgb(0_0_0/0.25)]",
              item.tone === "error" ? "bg-brick" : item.tone === "info" ? "bg-fg" : "bg-grass",
            )}
          >
            {item.message}
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
