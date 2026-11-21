import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import {
  REMEMBER_COOKIE,
  authCookieOptions,
  isAuthCookieName,
  isRemembered,
} from "@/lib/auth/session-cookie"
import { getSupabaseEnv } from "@/lib/supabase/env"

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-pathname", request.nextUrl.pathname)
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })
  const env = getSupabaseEnv()
  if (!env) return supabaseResponse

  // A session-cookie marker disappears with the browser; absence keeps the
  // previous persistent behavior for OAuth and magic-link sign-ins.
  const remember = isRemembered(request.cookies.get(REMEMBER_COOKIE)?.value)

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        })
        const lifetime = authCookieOptions(remember)
        cookiesToSet.forEach(({ name, value, options }) => {
          // Never turn an explicit deletion (maxAge 0) back into a live cookie.
          const cookieOptions =
            isAuthCookieName(name) && options?.maxAge !== 0
              ? { ...options, ...lifetime }
              : options
          supabaseResponse.cookies.set(name, value, cookieOptions)
        })
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  // Refresh the session. Do not gate public routes here.
  await supabase.auth.getUser()

  return supabaseResponse
}
