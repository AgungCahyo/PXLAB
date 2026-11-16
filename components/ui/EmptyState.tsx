import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "pixel-frame flex flex-col items-start gap-3 bg-soft px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <div className="text-earth" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="pixel-title">{title}</h2>
      <p className="max-w-lg text-[15px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-2 flex flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}
