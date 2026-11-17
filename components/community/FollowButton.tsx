"use client"

import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import {
  followCreatorAction,
  unfollowCreatorAction,
  type CommunityActionState,
} from "@/features/community/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { cn } from "@/lib/utils"

export function FollowButton({
  lang,
  userId,
  username,
  initialFollowing,
  member,
  returnPath,
}: {
  lang: Lang
  userId: string
  username: string
  initialFollowing: boolean
  member: boolean
  /** Path used as login next (profile or creation). */
  returnPath: string
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<CommunityActionState>(null)
  const pendingRef = useRef(false)
  pendingRef.current = pending

  useEffect(() => {
    // Do not clobber an in-flight optimistic toggle with a stale RSC snapshot.
    if (pendingRef.current) return
    setFollowing(initialFollowing)
  }, [initialFollowing, userId])

  function toggle() {
    if (pendingRef.current) return
    const previous = following
    const next = !following
    flushSync(() => {
      setFollowing(next)
      setPending(true)
      setError(null)
    })
    pendingRef.current = true

    const formData = new FormData()
    formData.set("user_id", userId)
    const action = next ? followCreatorAction : unfollowCreatorAction
    void action(null, formData).then((result) => {
      pendingRef.current = false
      setPending(false)
      if (result && "error" in result) {
        flushSync(() => {
          setFollowing(previous)
          setError(result)
        })
        return
      }
      // Keep optimistic value until props catch up after revalidate.
    })
  }

  if (!member) {
    return (
      <Link
        href={loginHref(lang, returnPath)}
        className={buttonClassName({ size: "sm", variant: "outline" })}
      >
        {copy.followSignIn[lang]}
      </Link>
    )
  }

  return (
    <div>
      {error && "error" in error ? (
        <Alert tone="error" className="mb-2">
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant={following ? "secondary" : "outline"}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-pressed={following}
        onClick={toggle}
        className={cn(
          "disabled:opacity-100",
          following && "shadow-[4px_4px_0_0_var(--fg)]",
        )}
      >
        {following ? copy.following[lang] : copy.follow[lang]}
      </Button>
      <span className="sr-only">@{username}</span>
    </div>
  )
}
