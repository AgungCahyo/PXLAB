import { NextResponse } from "next/server"
import { getCurrentProfile, type MemberProfile } from "@/lib/auth/session"
import { langOf } from "@/lib/i18n"
import { postAuthPath, safeInternalPath } from "@/lib/paths"
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
  const oauthError = searchParams.get("error")
  const oauthDescription = searchParams.get("error_description")
  const next = safeInternalPath(searchParams.get("next"), "/")
  const login = loginPathForNext(next)
  const lang = langOf(next)

  if (oauthError) {
    const kind = oauthErrorKind(oauthDescription ?? oauthError)
    return NextResponse.redirect(new URL(`${login}?error=${kind}`, origin))
  }

  let exchanged = false
  if (code) {
    const supabase = await createServerSupabase()
    if (!supabase) {
      return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const kind = oauthErrorKind(error.message)
      return NextResponse.redirect(new URL(`${login}?error=${kind}`, origin))
    }
    exchanged = true
  }

  const profile = exchanged ? await waitForProfile() : await getCurrentProfile()
  // Missing profile after OAuth → welcome (gate); missing session → login via member layout.
  return NextResponse.redirect(new URL(postAuthPath(lang, next, profile), origin))
}
