import { NextResponse } from "next/server"
import { safeInternalPath } from "@/lib/paths"
import { createServerSupabase } from "@/lib/supabase/server"

function loginPathForNext(next: string) {
  return next.startsWith("/en") || next.startsWith("/en/") ? "/en/login" : "/login"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin } = url
  const code = searchParams.get("code")
  const oauthError = searchParams.get("error")
  const next = safeInternalPath(searchParams.get("next"), "/")
  const login = loginPathForNext(next)

  if (oauthError) {
    return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
  }

  if (code) {
    const supabase = await createServerSupabase()
    if (!supabase) {
      return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`${login}?error=oauth`, origin))
    }
  }

  return NextResponse.redirect(new URL(next, origin))
}
