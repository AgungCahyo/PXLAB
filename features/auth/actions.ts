"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"
import type { ZodError } from "zod"
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
  REGISTER_PER_EMAIL,
  REGISTER_PER_IP,
  RESET_PER_EMAIL,
  RESET_PER_IP,
  RESEND_PER_EMAIL,
  clientIp,
  takeRateLimit,
} from "@/lib/auth/rate-limit"
import { getCurrentProfile } from "@/lib/auth/session"
import { href, isLang, type Lang } from "@/lib/i18n"
import { authDestination, loginHref, postAuthPath } from "@/lib/paths"
import { SITE_URL } from "@/lib/site"
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

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return { error: mapLoginError(error) }

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
  revalidatePath("/", "layout")
  const login = loginHref(lang, String(formData.get("next") ?? ""))
  redirect(`${login}${login.includes("?") ? "&" : "?"}reset=done`)
}

export async function logoutAction(formData: FormData) {
  const lang = langOf(formData.get("lang"))
  const supabase = await createServerSupabase()
  if (supabase) {
    await supabase.auth.signOut()
  }
  revalidatePath("/", "layout")
  redirect(href(lang, "/"))
}
