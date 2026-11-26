import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: "border-line bg-card text-fg",
  warning: "border-coin bg-soft text-fg",
  error: "border-brick bg-soft text-fg",
} as const;

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof tones;
  title?: string;
  children: ReactNode;
  /** Hairline surface for social pages; studio keeps the pixel frame. */
  flat?: boolean;
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  flat = false,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "px-4 py-3 text-[14px] leading-relaxed",
        flat ? "border border-[color:var(--soc-hairline)] bg-soft" : cn("pixel-frame", tones[tone]),
        className,
      )}
      {...props}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={cn(title && "mt-1", "text-muted")}>{children}</div>
    </div>
  );
}
