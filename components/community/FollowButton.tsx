"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { socialButtonClass } from "@/components/social/socialButton"
import {
  followCreatorAction,
  unfollowCreatorAction,
  type CommunityActionState,
} from "@/features/community/actions"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { reconcileDesiredState } from "@/lib/social-like"

export function FollowButton({
  lang,
  userId,
  username,
  initialFollowing,
  member,
  returnPath,
  compact = false,
}: {
  lang: Lang
  userId: string
  username: string
  initialFollowing: boolean
  member: boolean
  /** Path used as login next (profile or creation). */
  returnPath: string
  /** Smaller presentation for compact creator cards; actions are unchanged. */
  compact?: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<CommunityActionState>(null)
  const desiredRef = useRef(initialFollowing)
  const confirmedRef = useRef(initialFollowing)
  const syncingRef = useRef(false)

  useEffect(() => {
    // Do not clobber an in-flight optimistic toggle with a stale RSC snapshot.
    if (syncingRef.current) return
    desiredRef.current = initialFollowing
    confirmedRef.current = initialFollowing
    setFollowing(initialFollowing)
  }, [initialFollowing, userId])

  const sync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    try {
      let rejected: CommunityActionState = null
      const outcome = await reconcileDesiredState({
        getDesired: () => desiredRef.current,
        getConfirmed: () => confirmedRef.current,
        setState: async (desired) => {
          const formData = new FormData()
          formData.set("user_id", userId)
          formData.set("desired", String(desired))
          const action = desired ? followCreatorAction : unfollowCreatorAction
          const result = await action(null, formData)
          if (!result || !("ok" in result)) {
            if (result && "error" in result) rejected = result
            return { ok: false }
          }
          return { ok: true, state: result.following ?? desired }
        },
        onConfirmed: (state) => {
          confirmedRef.current = state
          setFollowing(state)
        },
        onDesired: (state) => {
          desiredRef.current = state
        },
        onRollback: (confirmed) => {
          desiredRef.current = confirmed
          setFollowing(confirmed)
        },
      })
      setError(outcome === "rolled_back" ? (rejected ?? { error: "invalid_input" }) : null)
    } finally {
      syncingRef.current = false
      setPending(false)
    }
  }, [userId])

  function toggle() {
    const next = !desiredRef.current
    desiredRef.current = next
    flushSync(() => {
      setFollowing(next)
      setPending(true)
      setError(null)
    })
    void sync()
  }

  if (!member) {
    return (
      <Link
        href={loginHref(lang, returnPath)}
        className={socialButtonClass({
          variant: "solid",
          size: "sm",
          className: compact ? "min-w-[4.75rem] px-2 text-[12px]" : undefined,
        })}
      >
        {compact ? copy.followSignInCompact[lang] : copy.followSignIn[lang]}
      </Link>
    )
  }

  return (
    <div className="relative">
      {error && "error" in error ? (
        <Alert tone="error" flat className="mb-2">
          {copy.errors[error.error][lang]}
        </Alert>
      ) : null}
      <button
        type="button"
        aria-busy={pending || undefined}
        aria-pressed={following}
        onClick={toggle}
        className={socialButtonClass({
          variant: following ? "soft" : "brand",
          size: "sm",
          className: compact
            ? "min-w-[4.75rem] px-2 text-[12px] disabled:opacity-100"
            : "min-w-28 disabled:opacity-100",
        })}
      >
        {following ? copy.following[lang] : copy.follow[lang]}
      </button>
      <span className="sr-only">@{username}</span>
    </div>
  )
}
