import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Page-level empty uses pixel title; section stays sans for long copy. */
  tone?: "page" | "section";
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  tone = "page",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <div className="text-muted" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2
        className={
          tone === "section"
            ? "text-[1.125rem] font-medium text-fg"
            : "pixel-title"
        }
      >
        {title}
      </h2>
      <p className="max-w-lg text-[15px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2 flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
