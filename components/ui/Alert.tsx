import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  info: "border-earth bg-card text-fg",
  warning: "border-coin bg-soft text-fg",
  error: "border-brick bg-soft text-fg",
} as const;

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof tones;
  title?: string;
  children: ReactNode;
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  ...props
}: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("pixel-frame px-4 py-3 text-[14px] leading-relaxed", tones[tone], className)}
      {...props}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={cn(title && "mt-1", "text-muted")}>{children}</div>
    </div>
  );
}
