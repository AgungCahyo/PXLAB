/** Helpers for Supabase email-verification callbacks and unverified users. */

export type VerificationIssue = "expired" | "invalid"

type ErrorLike = {
  message?: string | null
  code?: string | null
  description?: string | null
}

type UserLike = {
  email_confirmed_at?: string | null
  app_metadata?: { provider?: string | null } | null
}

/**
 * Supabase reports bad confirmation/magic links with `error_code=otp_expired`
 * or a description such as "Email link is invalid or has expired". Return null
 * for anything else so OAuth failures keep their existing handling.
 */
export function classifyVerificationError(
  error: ErrorLike | null | undefined,
): VerificationIssue | null {
  const code = (error?.code ?? "").toLowerCase()
  const text = [error?.code, error?.message, error?.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const linkRelated =
    code === "otp_expired" ||
    code === "flow_state_not_found" ||
    text.includes("email link") ||
    text.includes("verification link") ||
    text.includes("confirmation link") ||
    text.includes("magic link") ||
    text.includes("link has expired") ||
    text.includes("already used") ||
    text.includes("already been used") ||
    text.includes("otp") ||
    text.includes("token has expired") ||
    text.includes("token is invalid")
  if (!linkRelated) return null

  if (text.includes("already used") || text.includes("already been used")) return "invalid"
  if (code === "otp_expired") return "expired"
  if (text.includes("expired") && !text.includes("invalid")) return "expired"
  return "invalid"
}

/**
 * Google (and other OAuth providers) verify addresses upstream, so those users
 * must never be pushed through an email confirmation they do not need.
 */
export function needsEmailVerification(user: UserLike | null | undefined): boolean {
  if (!user) return false
  const provider = user.app_metadata?.provider?.toLowerCase()
  if (provider && provider !== "email") return false
  return !user.email_confirmed_at
}
