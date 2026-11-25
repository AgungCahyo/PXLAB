"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { cn } from "@/lib/utils";

/* Shared scroll lock so stacked modals never restore body scroll too early. */
let scrollLockCount = 0;
let lockedBodyOverflow = "";

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    lockedBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = lockedBodyOverflow;
  }
}

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: ReactNode;
  className?: string;
  /** Flat social chrome for public surfaces; studio dialogs keep the default frame. */
  tone?: "default" | "social";
  /** Default is a compact sheet. `md` fits compact forms, `lg` fits wide content. */
  size?: "default" | "md" | "lg";
};

export function Dialog({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
  className,
  tone = "default",
  size = "default",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  /* Focus returns to the trigger on every close path (prop change, Escape,
     backdrop, close button, unmount-while-open), not just programmatic close. */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const restore = () => {
      const target = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (target && target.isConnected && target !== document.activeElement) {
        target.focus();
      }
    };

    dialog.addEventListener("close", restore);
    return () => {
      dialog.removeEventListener("close", restore);
      if (dialog.open) {
        dialog.close();
        restore();
      }
    };
  }, []);

  /* Lock background scroll only while this instance is modal. */
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        /* `flex` on a closed <dialog> overrides the UA `display: none`, so every
           modal renders at once. Only apply layout once the browser marks it open. */
        "m-auto max-h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl bg-card p-0 text-fg shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm open:flex open:flex-col",
        size === "lg"
          ? "w-[min(calc(100%-1rem),50rem)]"
          : size === "md"
            ? "w-[min(calc(100%-1.5rem),36rem)]"
            : "w-[min(calc(100%-2rem),28rem)]",
        "border border-slate-200",
        className,
      )}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "flex shrink-0 items-start justify-between gap-4 px-5 py-4",
          tone === "social" ? "border-b border-[color:var(--soc-hairline)]" : "border-b border-line",
        )}
      >
        <h2 id={titleId} className={tone === "social" ? "text-[15px] font-semibold text-fg" : "pixel-title"}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className={
            tone === "social"
              ? "inline-flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:bg-soft hover:text-fg"
              : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-slate-100 hover:text-fg"
          }
          aria-label={closeLabel}
        >
          <PixelIcon name="close" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
    </dialog>
  );
}
