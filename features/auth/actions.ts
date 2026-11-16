"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ZodError } from "zod"
import {
  mapLoginError,
  mapRegisterError,
  type AuthErrorCode,
  type AuthField,
} from "@/lib/auth/errors"
import { getProfileByUsername, getSessionUserId } from "@/lib/auth/session"
import { href, isLang, type Lang } from "@/lib/i18n"
import { authDestination, resetPasswordHref } from "@/lib/paths"
import { SITE_URL } from "@/lib/site"
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
    else if (key === "password") fields.password = "invalid_password"
    else if (key === "username") {
      fields.username =
        issue.message === "username_reserved" ? "username_reserved" : "username_format"
    } else if (key === "displayName") fields.displayName = "invalid_input"
  }
  return fields
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
  })
  if (!parsed.success) {
    return { error: "invalid_input", fields: fieldsFromZod(parsed.error) }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const taken = await getProfileByUsername(parsed.data.username)
  if (taken) return { error: "username_taken", fields: { username: "username_taken" } }

  const { destination, emailRedirectTo } = emailRedirect(lang, formData.get("next"))
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      },
      emailRedirectTo,
    },
  })

  if (error) return { error: mapRegisterError(error) }

  revalidatePath("/", "layout")
  if (data.session) {
    redirect(destination)
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
  redirect(authDestination(lang, formData.get("next")))
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

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const afterReset = authDestination(lang, formData.get("next"))
  const resetPath = resetPasswordHref(lang, afterReset)
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(resetPath)}`,
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
    return { error: "invalid_password", fields: { password: "invalid_password" } }
  }
  if (password.data !== confirm) {
    return { error: "password_mismatch", fields: { password: "password_mismatch" } }
  }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase.auth.updateUser({ password: password.data })
  if (error) return { error: "generic_auth" }

  revalidatePath("/", "layout")
  redirect(authDestination(lang, formData.get("next")))
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
