import { GeneratedAvatar } from "@/components/profiles/GeneratedAvatar"
import {
  defaultAvatarConfig,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar-gen"
import { cn } from "@/lib/utils"

/** Legacy static mark — only when no user id / config is available. */
export function ProfileAvatarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("pixel-deco h-full w-full", className)}
      aria-hidden="true"
    >
      <rect x="6" y="4" width="20" height="18" className="fill-soft" />
      <rect x="8" y="6" width="16" height="14" className="fill-card" />
      <rect x="8" y="6" width="16" height="4" className="fill-earth" />
      <rect x="10" y="4" width="12" height="2" className="fill-earth" />
      <rect x="11" y="12" width="3" height="3" className="fill-fg" />
      <rect x="18" y="12" width="3" height="3" className="fill-fg" />
      <rect x="15" y="15" width="2" height="2" className="fill-muted" />
      <rect x="12" y="18" width="8" height="2" className="fill-brick" />
      <rect x="4" y="24" width="24" height="6" className="fill-sky" />
      <rect x="10" y="22" width="12" height="4" className="fill-sky" />
    </svg>
  )
}

export function ProfileAvatar({
  src,
  alt,
  size = "md",
  className,
  avatarConfig = null,
  userId = null,
}: {
  src: string | null | undefined
  alt: string
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
  avatarConfig?: AvatarConfig | null
  userId?: string | null
}) {
  const box =
    size === "xs"
      ? "h-8 w-8"
      : size === "sm"
        ? "h-10 w-10"
        : size === "lg"
          ? "h-20 w-20 sm:h-24 sm:w-24"
          : "h-16 w-16 sm:h-20 sm:w-20"
  const border = size === "xs" ? "border-2" : "border-[3px]"
  const config = parseAvatarConfig(avatarConfig)
  const fallbackConfig = !src && !config && userId ? defaultAvatarConfig(userId) : null
  const generated = config ?? fallbackConfig

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border-earth bg-soft",
        border,
        box,
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- member avatars from storage / https
        <img
          src={src}
          alt={alt}
          width={size === "xs" ? 32 : 96}
          height={size === "xs" ? 32 : 96}
          className="h-full w-full object-cover"
          decoding="async"
        />
      ) : generated ? (
        <GeneratedAvatar config={generated} title={alt} />
      ) : (
        <ProfileAvatarMark />
      )}
    </div>
  )
}
