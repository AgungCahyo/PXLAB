"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@/components/ui/Dialog"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { PixelNewForm } from "./PixelNewForm"

/**
 * Compact shell for the new-artwork flow. Kept separate from the form so a
 * trigger can open it with local client state instead of navigating away from
 * the current page (which would re-render the whole route).
 */
export function NewArtworkDialog({
  lang,
  open,
  onClose,
  children,
}: {
  lang: Lang
  open?: boolean
  onClose?: () => void
  children: ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(true)
  const closedRef = useRef(false)
  const isOpen = open ?? internalOpen

  /* Dialog fires `close` again when its effect closes the native element. */
  useEffect(() => {
    if (isOpen) closedRef.current = false
  }, [isOpen])

  const close = () => {
    if (closedRef.current) return
    closedRef.current = true
    if (open === undefined) setInternalOpen(false)
    onClose?.()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      size="md"
      tone="social"
      title={copy.createNewHeading[lang]}
      closeLabel={copy.createCancel[lang]}
    >
      {children}
    </Dialog>
  )
}

/** Opens the dialog in place, keeping the current route mounted. */
export function NewArtworkTrigger({
  lang,
  className,
  ariaLabel,
  children,
}: {
  lang: Lang
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className={className}>
        {children}
      </button>
      <NewArtworkDialog lang={lang} open={open} onClose={close}>
        <PixelNewForm lang={lang} onCancel={close} />
      </NewArtworkDialog>
    </>
  )
}

/** Direct visit to `/create`: the dialog owns its open state and returns to works. */
export function NewArtworkRouteDialog({ lang }: { lang: Lang }) {
  const router = useRouter()
  const close = () => router.push(href(lang, "/dashboard"))

  return (
    <NewArtworkDialog lang={lang} onClose={close}>
      <PixelNewForm lang={lang} onCancel={close} />
    </NewArtworkDialog>
  )
}
