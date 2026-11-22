import { cn } from "@/lib/utils"

export function PixelArt({
  src,
  alt,
  variant = "stage",
  fill = false,
  framed = true,
  priority = false,
  className,
}: {
  src: string
  alt: string
  variant?: "stage" | "thumb"
  fill?: boolean
  framed?: boolean
  /** Prefer high fetch priority for LCP artwork on detail. */
  priority?: boolean
  className?: string
}) {
  return (
    <figure
      className={cn(
        "m-0 bg-bg",
        variant === "stage" && "pixel-present",
        variant === "stage" && fill && "pixel-present-fill",
        variant === "thumb" && "pixel-thumb",
        framed && "pixel-frame",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={variant === "thumb" ? "pixel-thumb-art" : "pixel-present-art"}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : variant === "thumb" ? "lazy" : undefined}
        decoding={priority ? "async" : undefined}
      />
    </figure>
  )
}
