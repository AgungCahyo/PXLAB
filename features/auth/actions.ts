"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"
import type { ZodError } from "zod"
import { reauthMetadata, verifyReauth } from "@/lib/auth/account-security"
import {
  classifySignupConflict,
  mapLoginError,
  mapRegisterError,
  type AuthErrorCode,
  type AuthField,
} from "@/lib/auth/errors"
import {
  RECOVERY_COOKIE,
  RECOVERY_STATE_PARAM,
  UPDATE_PASSWORD_PER_TICKET,
  createRecoveryState,
  verifyRecoveryTicket,
} from "@/lib/auth/recovery"
import {
  ACCOUNT_PER_IP,
  DELETE_PER_USER,
  EMAIL_CHANGE_PER_USER,
  LOGIN_PER_EMAIL,
  LOGIN_PER_IP,
  REAUTH_PER_USER,
  REGISTER_PER_EMAIL,
  REGISTER_PER_IP,
  RESET_PER_EMAIL,
  RESET_PER_IP,
  RESEND_PER_EMAIL,
  SESSION_PER_USER,
  clientIp,
  takeRateLimit,
} from "@/lib/auth/rate-limit"
import {
  REMEMBER_COOKIE,
  authCookieOptions,
  clearAuthCookies,
  isAuthCookieName,
  rememberCookieOptions,
} from "@/lib/auth/session-cookie"
import { getCurrentAuthUser, getCurrentProfile } from "@/lib/auth/session"
import { needsEmailVerification } from "@/lib/auth/verification"
import { href, isLang, type Lang } from "@/lib/i18n"
import { authDestination, loginHref, postAuthPath, verifyEmailHref } from "@/lib/paths"
import { SITE_URL } from "@/lib/site"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import { emailSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/validations/profile"

export type AuthActionState =
  | {
      error: AuthErrorCode
      fields?: Partial<Record<AuthField, AuthErrorCode>>
    }
  | { ok: true; needsEmail: boolean; email?: string }
  | { ok: true; resent: true }
  | { ok: true; resetSent: true }
  | { ok: true; reauthSent: true }
  | { ok: true; passwordChanged: true }
  | { ok: true; emailChangeSent: true }
  | null

function langOf(value: FormDataEntryValue | null): Lang {
  return isLang(String(value ?? "")) ? (value as Lang) : "id"
}

function siteOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL
}

function emailRedirect(lang: Lang, next: FormDataEntryValue | null) {
  const destination = authDestination(lang, next)
  return {
    destination,
    emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(destination)}`,
  }
}

function fieldsFromZod(error: ZodError): Partial<Record<AuthField, AuthErrorCode>> {
  const fields: Partial<Record<AuthField, AuthErrorCode>> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "") as AuthField | ""
    if (key === "email") fields.email = "invalid_email"
    else if (key === "password") {
      fields.password = issue.message === "password_weak" ? "password_weak" : "invalid_password"
    } else if (key === "username") {
      fields.username =
        issue.message === "username_reserved" ? "username_reserved" : "username_format"
    } else if (key === "displayName") fields.displayName = "invalid_input"
  }
  return fields
}

function mapRecoveryError(error: { message?: string; code?: string } | null | undefined): AuthErrorCode {
  const message = (error?.message ?? "").toLowerCase()
  if (message.includes("weak") || message.includes("password should be")) return "password_weak"
  return "generic_auth"
}

type AccountGate =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentAuthUser>>> }
  | { ok: false; error: AuthErrorCode }

async function requireAccountUser(): Promise<AccountGate> {
  const user = await getCurrentAuthUser()
  if (!user) return { ok: false, error: "not_authenticated" }
  return { ok: true, user }
}

/** One shared process-local window per operation, per IP and per user. */
async function allowAccountAction(key: string, userId: string, limit: number) {
  const ip = await clientIp()
  return (
    takeRateLimit(`${key}:ip:${ip}`, ACCOUNT_PER_IP) &&
    takeRateLimit(`${key}:user:${userId}`, limit)
  )
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "invalid_input", fields: fieldsFromZod(parsed.error) }
  }

  const email = parsed.data.email
  const ip = await clientIp()
  if (
    !takeRateLimit(`register:ip:${ip}`, REGISTER_PER_IP) ||
    !takeRateLimit(`register:email:${email}`, REGISTER_PER_EMAIL)
  ) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  // Identity (username / display name) is collected on /welcome after auth.
  const { emailRedirectTo } = emailRedirect(lang, formData.get("next"))
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    const conflict = classifySignupConflict(error)
    if (conflict) {
      // REG-01/REG-05: never reveal whether the address exists (or how it was
      // first registered). Email the owner a magic link so they can sign in.
      // Requires Supabase Magic Link sign-in; branded template:
      // supabase/templates/magic-link.html. Sending happens after the response
      // so both paths answer equally fast.
      after(async () => {
        const mailer = createPublicSupabase()
        if (!mailer) return
        try {
          await mailer.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false, emailRedirectTo },
          })
        } catch {
          // Anti-enumeration: a failed notification must not change the reply.
        }
      })
      revalidatePath("/", "layout")
      return { ok: true, needsEmail: true, email: parsed.data.email }
    }
    return { error: mapRegisterError(error) }
  }

  revalidatePath("/", "layout")
  if (data.session) {
    // REG-02: a brand-new account always finishes onboarding, even when email
    // confirmation is disabled and signUp returns a session immediately.
    redirect(postAuthPath(lang, formData.get("next"), null))
  }
  return { ok: true, needsEmail: true, email: parsed.data.email }
}

export async function resendRegisterEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  if (!email.includes("@")) return { error: "invalid_email", fields: { email: "invalid_email" } }

  const ip = await clientIp()
  if (
    !takeRateLimit(`resend:ip:${ip}`, REGISTER_PER_IP) ||
    !takeRateLimit(`resend:email:${email}`, RESEND_PER_EMAIL)
  ) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { emailRedirectTo } = emailRedirect(lang, formData.get("next"))
  // Always succeed from the UI’s perspective (anti-enumeration).
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  })
  return { ok: true, resent: true }
}

export async function signInWithGoogleAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const destination = authDestination(lang, formData.get("next"))
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(destination)}`,
    },
  })

  if (error || !data.url) return { error: "oauth_failed" }
  redirect(data.url)
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "invalid_input", fields: fieldsFromZod(parsed.error) }
  }

  const email = parsed.data.email.toLowerCase()
  const ip = await clientIp()
  if (
    !takeRateLimit(`login:ip:${ip}`, LOGIN_PER_IP) ||
    !takeRateLimit(`login:email:${email}`, LOGIN_PER_EMAIL)
  ) {
    return { error: "limit_reached" }
  }

  // Drop any pre-existing (possibly planted) session before authenticating.
  // signInWithPassword then writes a freshly issued refresh token.
  const cookieStore = await cookies()
  clearAuthCookies(cookieStore)

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  })

  if (error) return { error: mapLoginError(error) }

  // Remember-me extends the cookie lifetime; without it the session dies with
  // the browser. @supabase/ssr forces 400 days on writes, so reapply it here.
  const remember = formData.get("remember") === "1"
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberCookieOptions(remember))
  for (const cookie of cookieStore.getAll()) {
    if (isAuthCookieName(cookie.name)) {
      cookieStore.set(cookie.name, cookie.value, authCookieOptions(remember))
    }
  }
  cookieStore.delete(RECOVERY_COOKIE)

  // Only reachable when credentials were valid and the project still issued a
  // session without confirmation. Never applied to OAuth-verified addresses.
  if (needsEmailVerification(data.user)) {
    redirect(verifyEmailHref(lang, authDestination(lang, formData.get("next"))))
  }

  revalidatePath("/", "layout")
  const profile = await getCurrentProfile()
  redirect(postAuthPath(lang, formData.get("next"), profile))
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) {
    return { error: "invalid_email", fields: { email: "invalid_email" } }
  }

  const ip = await clientIp()
  if (
    !takeRateLimit(`reset:ip:${ip}`, RESET_PER_IP) ||
    !takeRateLimit(`reset:email:${parsed.data}`, RESET_PER_EMAIL)
  ) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const destination = authDestination(lang, formData.get("next"))
  const state = createRecoveryState({ lang, next: destination })
  if (!state) return { error: "not_configured" }

  // A dedicated, signed callback carries the recovery capability. The generic
  // auth callback never sees a recovery code again.
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteOrigin()}/auth/recovery?${RECOVERY_STATE_PARAM}=${encodeURIComponent(state)}`,
  })
  // Anti-enumeration: always look successful.
  return { ok: true, resetSent: true }
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const password = passwordSchema.safeParse(formData.get("password"))
  const confirm = String(formData.get("confirm") ?? "")
  if (!password.success) {
    return {
      error: "invalid_password",
      fields: { password: fieldsFromZod(password.error).password ?? "invalid_password" },
    }
  }
  if (password.data !== confirm) {
    return { error: "password_mismatch", fields: { password: "password_mismatch" } }
  }

  // A normal session is never enough: only the callback-issued ticket works.
  const cookieStore = await cookies()
  const rawTicket = cookieStore.get(RECOVERY_COOKIE)?.value
  const ticket = verifyRecoveryTicket(rawTicket)
  if (!ticket) return { error: "not_authenticated" }
  if (!takeRateLimit(`recovery:${ticket.nonce}`, UPDATE_PASSWORD_PER_TICKET)) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  // Restore the recovery session only for this mutation, then revoke it.
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: ticket.accessToken,
    refresh_token: ticket.refreshToken,
  })
  if (sessionError) {
    cookieStore.delete(RECOVERY_COOKIE)
    return { error: "not_authenticated" }
  }

  const { error } = await supabase.auth.updateUser({ password: password.data })
  if (error) return { error: mapRecoveryError(error) }

  await supabase.auth.signOut({ scope: "global" })
  cookieStore.delete(RECOVERY_COOKIE)
  cookieStore.delete(REMEMBER_COOKIE)
  revalidatePath("/", "layout")
  const login = loginHref(lang, String(formData.get("next") ?? ""))
  redirect(`${login}${login.includes("?") ? "&" : "?"}reset=done`)
}

export async function logoutAction(formData: FormData) {
  const lang = langOf(formData.get("lang"))
  const supabase = await createServerSupabase()
  if (supabase) {
    // Explicit local scope: other devices stay signed in. The settings panel
    // offers the global and "others" variants as separate, deliberate actions.
    await supabase.auth.signOut({ scope: "local" })
  }
  const cookieStore = await cookies()
  clearAuthCookies(cookieStore)
  cookieStore.delete(REMEMBER_COOKIE)
  cookieStore.delete(RECOVERY_COOKIE)
  revalidatePath("/", "layout")
  redirect(href(lang, "/"))
}

/** SEC-01: issues the re-auth nonce used by accounts without a local password. */
export async function sendReauthCodeAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  void formData // the code is sent to the signed-in user's own address
  const gate = await requireAccountUser()
  if (!gate.ok) return { error: gate.error }
  if (!(await allowAccountAction("reauth", gate.user.id, REAUTH_PER_USER))) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }
  const { error } = await supabase.auth.reauthenticate()
  if (error) return { error: "reauth_failed" }
  return { ok: true, reauthSent: true }
}

/** SEC-01: every password change is preceded by a fresh identity check. */
export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = passwordSchema.safeParse(formData.get("password"))
  if (!password.success) {
    return {
      error: "invalid_password",
      fields: { password: fieldsFromZod(password.error).password ?? "invalid_password" },
    }
  }
  if (password.data !== String(formData.get("confirm") ?? "")) {
    return { error: "password_mismatch", fields: { password: "password_mismatch" } }
  }

  const gate = await requireAccountUser()
  if (!gate.ok) return { error: gate.error }
  if (!(await allowAccountAction("password", gate.user.id, REAUTH_PER_USER))) {
    return { error: "limit_reached" }
  }
  const reauth = await verifyReauth(gate.user, {
    currentPassword: formData.get("currentPassword"),
    nonce: formData.get("nonce"),
  })
  if (!reauth.ok) return { error: reauth.error }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }
  const { error } = await supabase.auth.updateUser(
    reauth.nonce ? { password: password.data, nonce: reauth.nonce } : { password: password.data },
  )
  if (error) return { error: reauth.nonce ? "reauth_failed" : mapRecoveryError(error) }

  // A new credential invalidates every other device, but keeps this session.
  await supabase.auth.signOut({ scope: "others" })
  revalidatePath("/", "layout")
  return { ok: true, passwordChanged: true }
}

/** SEC-02: Supabase verifies the new address before it replaces the old one. */
export async function changeEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = emailSchema.safeParse(formData.get("email"))
  if (!parsed.success) {
    return { error: "invalid_email", fields: { email: "invalid_email" } }
  }

  const gate = await requireAccountUser()
  if (!gate.ok) return { error: gate.error }
  const nextEmail = parsed.data.toLowerCase()
  if (nextEmail === (gate.user.email ?? "").toLowerCase()) return { error: "email_unchanged" }
  if (!(await allowAccountAction("email", gate.user.id, EMAIL_CHANGE_PER_USER))) {
    return { error: "limit_reached" }
  }
  const reauth = await verifyReauth(gate.user, {
    currentPassword: formData.get("currentPassword"),
    nonce: formData.get("nonce"),
  })
  if (!reauth.ok) return { error: reauth.error }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }
  const settings = href(lang, "/settings")
  const { error } = await supabase.auth.updateUser(
    reauth.nonce ? { email: nextEmail, nonce: reauth.nonce } : { email: nextEmail },
    {
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(settings)}&email_change=1`,
    },
  )
  if (error) return { error: "email_change_failed" }
  // Anti-enumeration: the new address may already be registered. The response
  // stays generic either way; only the address owner receives a confirmation.
  return { ok: true, emailChangeSent: true }
}

/** SEC-03: revoke every other refresh token while keeping this session. */
export async function signOutOtherDevicesAction(formData: FormData) {
  const lang = langOf(formData.get("lang"))
  const gate = await requireAccountUser()
  if (!gate.ok) redirect(href(lang, "/login"))
  if (!(await allowAccountAction("session", gate.user.id, SESSION_PER_USER))) {
    redirect(`${href(lang, "/settings")}?error=limit_reached`)
  }

  const supabase = await createServerSupabase()
  if (supabase) await supabase.auth.signOut({ scope: "others" })
  revalidatePath("/", "layout")
  redirect(`${href(lang, "/settings")}?session=others`)
}

/** SEC-03: revoke all sessions, including the current one. */
export async function signOutEverywhereAction(formData: FormData) {
  const lang = langOf(formData.get("lang"))
  const gate = await requireAccountUser()
  if (!gate.ok) redirect(href(lang, "/login"))
  if (!(await allowAccountAction("session", gate.user.id, SESSION_PER_USER))) {
    redirect(`${href(lang, "/settings")}?error=limit_reached`)
  }

  const supabase = await createServerSupabase()
  if (supabase) await supabase.auth.signOut({ scope: "global" })
  const cookieStore = await cookies()
  clearAuthCookies(cookieStore)
  cookieStore.delete(REMEMBER_COOKIE)
  cookieStore.delete(RECOVERY_COOKIE)
  revalidatePath("/", "layout")
  redirect(href(lang, "/"))
}

/**
 * SEC-04: re-auth, then delegate the privileged delete to a Supabase Edge
 * Function. The service-role key never enters the Next.js application bundle.
 */
export async function deleteAccountAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  if (String(formData.get("confirm") ?? "") !== "DELETE") return { error: "invalid_input" }

  const gate = await requireAccountUser()
  if (!gate.ok) return { error: gate.error }
  if (!(await allowAccountAction("delete", gate.user.id, DELETE_PER_USER))) {
    return { error: "limit_reached" }
  }
  const reauth = await verifyReauth(gate.user, {
    currentPassword: formData.get("currentPassword"),
    nonce: formData.get("nonce"),
  })
  if (!reauth.ok) return { error: reauth.error }

  const supabase = await createServerSupabase()
  const env = getSupabaseEnv()
  if (!supabase || !env) return { error: "not_configured" }

  if (reauth.nonce) {
    const { error } = await supabase.auth.updateUser(reauthMetadata(reauth.nonce))
    if (error) return { error: "reauth_failed" }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: "not_authenticated" }

  let response: Response
  try {
    response = await fetch(`${env.url}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.anonKey,
        "Content-Type": "application/json",
      },
    })
  } catch {
    return { error: "account_delete_failed" }
  }
  if (!response.ok) return { error: "account_delete_failed" }

  const cookieStore = await cookies()
  clearAuthCookies(cookieStore)
  cookieStore.delete(REMEMBER_COOKIE)
  cookieStore.delete(RECOVERY_COOKIE)
  revalidatePath("/", "layout")
  redirect(`${href(lang, "/")}?deleted=1`)
}
