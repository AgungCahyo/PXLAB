import Link from "next/link"
import { ProfileAvatar } from "@/components/profiles/ProfileAvatar"
import type { AvatarConfig } from "@/lib/avatar-gen"
import { href, type Lang } from "@/lib/i18n"
import { formatRelativeTime } from "@/lib/social-time"
import { cn } from "@/lib/utils"

/** Avatar + name + @username (+ time). The one creator-identity row used across social surfaces. */
export function CreatorLine({
  lang,
  creator,
  at,
  size = "sm",
  className,
}: {
  lang: Lang
  creator: {
    id?: string | null
    username: string | null
    displayName: string | null
    avatarUrl?: string | null
    avatarConfig?: AvatarConfig | null
  }
  at?: string | Date | null
  size?: "xs" | "sm"
  className?: string
}) {
  const name = creator.displayName || creator.username || "PXLB"
  const profile = creator.username ? href(lang, `/u/${creator.username}`) : null
  const body = (
    <>
      <ProfileAvatar
        src={creator.avatarUrl}
        avatarConfig={creator.avatarConfig}
        userId={creator.id}
        alt=""
        size={size}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-[14px] font-semibold text-fg">{name}</span>
        <span className="truncate text-[12px] text-muted">
          {creator.username ? `@${creator.username}` : null}
          {at ? <>{creator.username ? " · " : null}<time dateTime={new Date(at).toISOString()}>{formatRelativeTime(at, lang)}</time></> : null}
        </span>
      </span>
    </>
  )
  const cls = cn("flex min-w-0 items-center gap-2.5", className)
  return profile ? (
    <Link href={profile} className={cn(cls, "min-h-11")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
