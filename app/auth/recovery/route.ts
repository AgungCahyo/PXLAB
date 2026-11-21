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

/** Recovery-only callback: verifies the emailed token, then drops the session. */
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

  if (!state) return invalid()

  const tokenHash = searchParams.get("token_hash")
  const otpType = searchParams.get("type")
  const code = searchParams.get("code")
  const providerError = searchParams.get("error") ?? searchParams.get("error_description")
  if (providerError) return invalid()

  const supabase = await createServerSupabase()
  if (!supabase) return invalid()

  // The signed state above is required for both paths, so only a link minted by
  // requestPasswordResetAction() can ever reach this exchange.
  let exchange: { userId: string; accessToken: string; refreshToken: string } | null = null

  if (tokenHash && otpType === "recovery") {
    // Primary path: `token_hash` is device-independent. The email link points
    // straight here, so no PKCE verifier cookie from the requesting browser is
    // needed — essential when the mail is opened in another browser or app.
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    })
    if (error || !data.session?.refresh_token || !data.user) return invalid()
    exchange = {
      userId: data.user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  } else if (code) {
    // Legacy path for links already sent with the default ConfirmationURL.
    // PKCE requires the verifier cookie from the browser that started the flow.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.session?.refresh_token) return invalid()

    const redirectType = (data as { redirectType?: string | null }).redirectType
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return invalid()
    if (redirectType !== "recovery" && !userData.user.recovery_sent_at) return invalid()

    exchange = {
      userId: userData.user.id,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  }

  if (!exchange) return invalid()

  const ticket = createRecoveryTicket({ state, ...exchange })
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
