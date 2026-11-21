import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  RECOVERY_COOKIE,
  RECOVERY_STATE_PARAM,
  createRecoveryTicket,
  markRecoveryNonceUsed,
  recoveryCookieOptions,
  verifyRecoveryState,
} from "@/lib/auth/recovery"
import { langOf } from "@/lib/i18n"
import { forgotPasswordHref, resetPasswordHref } from "@/lib/paths"
import { createServerSupabase } from "@/lib/supabase/server"

/** Recovery-only callback: exchanges the emailed code, then drops the session. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const stateToken = searchParams.get(RECOVERY_STATE_PARAM)
  const state = verifyRecoveryState(stateToken)
  const lang = state?.lang ?? langOf(state?.next ?? "")
  const next = state?.next ?? "/"

  const fallback = forgotPasswordHref(lang, next)
  const invalid = () =>
    NextResponse.redirect(
      new URL(`${fallback}${fallback.includes("?") ? "&" : "?"}error=recovery_invalid`, origin),
    )

  const code = searchParams.get("code")
  const providerError = searchParams.get("error") ?? searchParams.get("error_description")
  if (providerError || !code || !state) return invalid()

  const supabase = await createServerSupabase()
  if (!supabase) return invalid()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.session?.refresh_token) return invalid()

  // auth-js tags PKCE exchanges with the email link type; older projects may
  // only expose recovery_sent_at. Either signal proves this was a recovery link.
  const redirectType = (data as { redirectType?: string | null }).redirectType
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || (redirectType !== "recovery" && !userData.user?.recovery_sent_at)) {
    return invalid()
  }

  const ticket = createRecoveryTicket({
    state,
    userId: userData.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  })
  if (!ticket || !markRecoveryNonceUsed(state.nonce)) return invalid()

  // The exchanged session is deliberately not kept: only the encrypted ticket
  // authorizes a password change. This prevents a reset link from becoming a
  // full authenticated session.
  const cookieStore = await cookies()
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.includes("-auth-token")) cookieStore.delete(cookie.name)
  }
  cookieStore.set(RECOVERY_COOKIE, ticket, recoveryCookieOptions())

  return NextResponse.redirect(new URL(resetPasswordHref(lang, next), origin))
}
