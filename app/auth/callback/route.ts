import { NextResponse } from "next/server"
import { getCurrentProfile, type MemberProfile } from "@/lib/auth/session"
import {
  classifyVerificationError,
  needsEmailVerification,
  type VerificationIssue,
} from "@/lib/auth/verification"
import { href, langOf } from "@/lib/i18n"
import { postAuthPath, safeInternalPath, verifyEmailHref } from "@/lib/paths"
import { createServerSupabase } from "@/lib/supabase/server"

function loginPathForNext(next: string) {
  return next.startsWith("/en") || next.startsWith("/en/") ? "/en/login" : "/login"
}

function oauthErrorKind(message: string | null | undefined) {
  const text = (message ?? "").toLowerCase()
  if (
    text.includes("already") ||
    text.includes("exists") ||
    text.includes("duplicate") ||
    text.includes("identity is already") ||
    text.includes("email address is already") ||
    text.includes("users_email")
  ) {
    return "oauth_email"
  }
  return "oauth"
}

async function waitForProfile(attempts = 4): Promise<MemberProfile | null> {
  for (let i = 0; i < attempts; i++) {
    const profile = await getCurrentProfile()
    if (profile) return profile
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (i + 1)))
    }
  }
  return null
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get("code")
  const errorCode = searchParams.get("error_code")
  const oauthError = searchParams.get("error")
  const oauthDescription = searchParams.get("error_description")
  const tokenHash = searchParams.get("token_hash")
  const otpType = searchParams.get("type")
  const emailChange = searchParams.get("email_change") === "1"
  const next = safeInternalPath(searchParams.get("next"), "/")
  const login = loginPathForNext(next)
  const lang = langOf(next)
  const settings = href(lang, "/settings")
  const verificationRedirect = (issue: VerificationIssue) =>
    NextResponse.redirect(new URL(verifyEmailHref(lang, next, issue), origin))

  if (oauthError || errorCode) {
    const issue = classifyVerificationError({
      code: errorCode,
      message: oauthDescription ?? oauthError ?? errorCode,
    })
    if (issue) return verificationRedirect(issue)
    // An unknown code without a top-level error is still a failed auth attempt.
    if (!oauthError) return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
    const kind = oauthErrorKind(oauthDescription ?? oauthError)
    return NextResponse.redirect(new URL(`${login}?error=${kind}`, origin))
  }

  // SEC-02: Supabase sends `token_hash&type=email_change` to the redirect URL
  // configured on updateUser(). Finalize it here, then return to settings.
  if (tokenHash && otpType === "email_change") {
    const supabase = await createServerSupabase()
    if (!supabase) return NextResponse.redirect(new URL(`${login}?error=not_configured`, origin))
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email_change" })
    if (error) return NextResponse.redirect(new URL(`${login}?error=generic_auth`, origin))
    return NextResponse.redirect(new URL(`${settings}?email=updated`, origin))
  }
  if (emailChange && !code) {
    const supabase = await createServerSupabase()
    const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } }
    if (!data.user) return NextResponse.redirect(new URL(login, origin))
    return NextResponse.redirect(new URL(`${settings}?email=updated`, origin))
  }

  let exchanged = false
  if (code) {
    const supabase = await createServerSupabase()
    if (!supabase) {
      return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
    }
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const issue = classifyVerificationError(error)
      if (issue) return verificationRedirect(issue)
      const kind = oauthErrorKind(error.message)
      return NextResponse.redirect(new URL(`${login}?error=${kind}`, origin))
    }
    // A session without a confirmed email must finish verification first.
    // OAuth users are already confirmed upstream, so they are never gated here.
    if (needsEmailVerification(data.user)) {
      return NextResponse.redirect(new URL(verifyEmailHref(lang, next), origin))
    }
    exchanged = true
  }

  const profile = exchanged ? await waitForProfile() : await getCurrentProfile()
  // Missing profile after verification/OAuth → welcome (onboarding gate).
  return NextResponse.redirect(new URL(postAuthPath(lang, next, profile), origin))
}
