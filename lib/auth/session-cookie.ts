/**
 * Remember-me session lifetimes for Supabase SSR.
 *
 * @supabase/ssr hard-codes a 400-day `maxAge` on every auth cookie it writes,
 * so the requested lifetime has to be reapplied both when the browser signs in
 * and whenever the middleware refreshes the session.
 */

export const REMEMBER_COOKIE = "pxlb_remember"
export const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60

const production = process.env.NODE_ENV === "production"

function cookieBase() {
  return { path: "/", sameSite: "lax" as const, secure: production }
}

/** A marker that survives restarts only when the user asked to stay signed in. */
export function rememberCookieOptions(remember: boolean) {
  return {
    ...cookieBase(),
    httpOnly: true,
    maxAge: remember ? REMEMBER_MAX_AGE : undefined,
  }
}

/**
 * Auth cookies stay JS-readable so `createBrowserSupabase()` can still see the
 * session; only the lifetime changes.
 */
export function authCookieOptions(remember: boolean) {
  return {
    ...cookieBase(),
    httpOnly: false,
    maxAge: remember ? REMEMBER_MAX_AGE : undefined,
  }
}

export function isAuthCookieName(name: string) {
  return name.includes("-auth-token")
}

/** Flows without a marker (OAuth, magic link) keep the previous persistent behavior. */
export function isRemembered(marker?: string | null) {
  return marker !== "0"
}

type ClearableCookies = {
  getAll(): Array<{ name: string }>
  delete(name: string): void
}

/** Drops every auth cookie, including chunked and stale ones. */
export function clearAuthCookies(store: ClearableCookies) {
  for (const cookie of store.getAll()) {
    if (isAuthCookieName(cookie.name)) store.delete(cookie.name)
  }
}
