import type { AuthErrorCode } from "@/lib/auth/errors"
import { createPublicSupabase } from "@/lib/supabase/public"

export type AccountUserLike = {
  id: string
  email?: string | null
  app_metadata?: { provider?: string | null } | null
}

export type ReauthResult = { ok: true; nonce: string | null } | { ok: false; error: AuthErrorCode }

export function accountProvider(user: AccountUserLike | null | undefined): string {
  return user?.app_metadata?.provider?.toLowerCase() ?? "email"
}

/** Google and other OAuth providers verify addresses upstream (no local password). */
export function isPasswordAccount(user: AccountUserLike | null | undefined): boolean {
  return accountProvider(user) === "email"
}

/**
 * Checks the current password on a cookie-less client so a failed attempt never
 * replaces the authenticated session. Only used after getUser() has confirmed
 * who is making the request; it does not reveal anything about other accounts.
 */
export async function verifyAccountPassword(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false
  const verifier = createPublicSupabase()
  if (!verifier) return false
  const { error } = await verifier.auth.signInWithPassword({ email, password })
  return !error
}

/**
 * Gate for every sensitive account mutation.
 * - Email accounts prove possession with the current password.
 * - OAuth accounts have no local password, so they use the nonce emailed by
 *   `supabase.auth.reauthenticate()`; Supabase validates it on `updateUser`.
 */
export async function verifyReauth(
  user: AccountUserLike | null | undefined,
  input: { currentPassword?: unknown; nonce?: unknown },
): Promise<ReauthResult> {
  if (!user?.email) return { ok: false, error: "not_authenticated" }

  if (isPasswordAccount(user)) {
    const password = typeof input.currentPassword === "string" ? input.currentPassword : ""
    if (!password) return { ok: false, error: "reauth_required" }
    if (!(await verifyAccountPassword(user.email, password))) {
      return { ok: false, error: "invalid_current_password" }
    }
    return { ok: true, nonce: null }
  }

  const nonce = typeof input.nonce === "string" ? input.nonce.trim() : ""
  if (nonce.length < 6) return { ok: false, error: "reauth_required" }
  return { ok: true, nonce }
}

/**
 * Supabase does not expose a standalone "check nonce" call, so OAuth re-auth is
 * confirmed by letting updateUser validate it. For deletion (where no attribute
 * is being changed) a harmless metadata stamp is used for that validation.
 */
export function reauthMetadata(nonce: string) {
  return { nonce, data: { pxlb_reauth_at: new Date().toISOString() } }
}
