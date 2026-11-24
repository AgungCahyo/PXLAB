"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel?: string;
  children: ReactNode;
  className?: string;
  /** Flat social chrome for public surfaces; studio dialogs keep the default frame. */
  tone?: "default" | "social";
  /** Default is a compact sheet. `lg` fits the new-artwork form. */
  size?: "default" | "lg";
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
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        /* `flex` on a closed <dialog> overrides the UA `display: none`, so every
           modal renders at once. Only apply layout once the browser marks it open. */
        "m-auto max-h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl bg-card p-0 text-fg shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm open:flex open:flex-col",
        size === "lg" ? "w-[min(calc(100%-1rem),50rem)]" : "w-[min(calc(100%-2rem),28rem)]",
        tone === "social"
          ? "border border-slate-200"
          : "pixel-frame border border-slate-200",
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
              : "inline-flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-transparent text-muted hover:border-earth hover:text-fg"
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
