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
};

export function Dialog({
  open,
  onClose,
  title,
  closeLabel = "Close",
  children,
  className,
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
        "pixel-frame m-auto w-[min(calc(100%-2rem),28rem)] bg-card p-0 text-fg backdrop:bg-fg/40",
        className,
      )}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id={titleId} className="pixel-title">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center border-[3px] border-transparent text-muted hover:border-earth hover:text-fg"
          aria-label={closeLabel}
        >
          <PixelIcon name="close" />
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
