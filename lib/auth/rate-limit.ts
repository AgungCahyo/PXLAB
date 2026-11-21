import { headers } from "next/headers"

/** Rolling one-hour windows. Counts are process-local; use host-level limits too. */
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
export const REGISTER_PER_IP = 20
export const REGISTER_PER_EMAIL = 3
export const RESEND_PER_EMAIL = 3
export const LOGIN_PER_IP = 20
export const LOGIN_PER_EMAIL = 10
export const RESET_PER_IP = 20
export const RESET_PER_EMAIL = 3
/** Sensitive account changes (re-auth, email, sessions, deletion). */
export const ACCOUNT_PER_IP = 20
export const REAUTH_PER_USER = 10
export const EMAIL_CHANGE_PER_USER = 3
export const SESSION_PER_USER = 10
export const DELETE_PER_USER = 3

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Returns false when the key already used its allowance in the current window. */
export function takeRateLimit(key: string, limit: number, now = Date.now()): boolean {
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    prune(now)
    return true
  }

  if (current.count >= limit) return false
  current.count += 1
  return true
}

function prune(now: number) {
  if (buckets.size < 500) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Best-effort client identifier from platform proxy headers. */
export async function clientIp(): Promise<string> {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || requestHeaders.get("x-real-ip")?.trim() || "unknown"
}
