import type { AvatarConfig } from "@/lib/avatar-gen"
import { AVATAR_HAIR, AVATAR_PALETTE, AVATAR_SHIRT, AVATAR_SKIN } from "@/lib/avatar-gen"
import { cn } from "@/lib/utils"

export function GeneratedAvatar({
  config,
  className,
  title,
}: {
  config: AvatarConfig
  className?: string
  title?: string
}) {
  const bg = AVATAR_PALETTE[config.bg % AVATAR_PALETTE.length]
  const skin = AVATAR_SKIN[config.skin % AVATAR_SKIN.length]
  const hair = AVATAR_HAIR[config.hairColor % AVATAR_HAIR.length]
  const shirt = AVATAR_SHIRT[config.shirt % AVATAR_SHIRT.length]
  const hairStyle = config.hair % 4
  const eyes = config.eyes % 3
  const mouth = config.mouth % 3

  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("pixel-deco h-full w-full", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" fill={bg} />
      {/* head */}
      <rect x="8" y="6" width="16" height="14" fill={skin} />
      {/* hair */}
      {hairStyle === 0 ? <rect x="8" y="4" width="16" height="5" fill={hair} /> : null}
      {hairStyle === 1 ? (
        <>
          <rect x="7" y="5" width="18" height="4" fill={hair} />
          <rect x="6" y="8" width="4" height="6" fill={hair} />
          <rect x="22" y="8" width="4" height="6" fill={hair} />
        </>
      ) : null}
      {hairStyle === 2 ? (
        <>
          <rect x="9" y="3" width="14" height="4" fill={hair} />
          <rect x="11" y="2" width="10" height="2" fill={hair} />
        </>
      ) : null}
      {hairStyle === 3 ? <rect x="8" y="5" width="16" height="3" fill={hair} /> : null}
      {/* eyes */}
      {eyes === 0 ? (
        <>
          <rect x="11" y="12" width="3" height="3" fill="#282b35" />
          <rect x="18" y="12" width="3" height="3" fill="#282b35" />
        </>
      ) : null}
      {eyes === 1 ? (
        <>
          <rect x="11" y="12" width="3" height="2" fill="#282b35" />
          <rect x="18" y="12" width="3" height="2" fill="#282b35" />
          <rect x="12" y="14" width="1" height="1" fill="#fffdf7" />
          <rect x="19" y="14" width="1" height="1" fill="#fffdf7" />
        </>
      ) : null}
      {eyes === 2 ? (
        <>
          <rect x="11" y="13" width="4" height="2" fill="#282b35" />
          <rect x="17" y="13" width="4" height="2" fill="#282b35" />
        </>
      ) : null}
      {/* mouth */}
      {mouth === 0 ? <rect x="13" y="18" width="6" height="2" fill="#e94b3c" /> : null}
      {mouth === 1 ? <rect x="14" y="18" width="4" height="2" fill="#936037" /> : null}
      {mouth === 2 ? (
        <>
          <rect x="13" y="17" width="2" height="2" fill="#e94b3c" />
          <rect x="17" y="17" width="2" height="2" fill="#e94b3c" />
        </>
      ) : null}
      {/* body */}
      <rect x="6" y="22" width="20" height="8" fill={shirt} />
      <rect x="10" y="20" width="12" height="4" fill={shirt} />
    </svg>
  )
}
