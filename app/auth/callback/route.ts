import { NextResponse } from "next/server"
import { safeInternalPath } from "@/lib/paths"
import { createServerSupabase } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeInternalPath(searchParams.get("next"), "/")

  if (code) {
    const supabase = await createServerSupabase()
    if (supabase) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  }

  return NextResponse.redirect(new URL(next, origin))
}
