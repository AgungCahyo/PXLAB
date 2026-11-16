"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { mapRegisterError, type AuthErrorCode } from "@/lib/auth/errors"
import { getProfileByUsername } from "@/lib/auth/session"
import { href, isLang, type Lang } from "@/lib/i18n"
import { authDestination } from "@/lib/paths"
import { createServerSupabase } from "@/lib/supabase/server"
import { loginSchema, registerSchema } from "@/lib/validations/profile"

export type AuthActionState = { error: AuthErrorCode } | { ok: true; needsEmail: boolean } | null

function langOf(value: FormDataEntryValue | null): Lang {
  return isLang(String(value ?? "")) ? (value as Lang) : "id"
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
  if (!parsed.success) return { error: "invalid_input" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const taken = await getProfileByUsername(parsed.data.username)
  if (taken) return { error: "username_taken" }

  const destination = authDestination(lang, formData.get("next"))
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(destination)}`,
    },
  })

  if (error) return { error: mapRegisterError(error) }

  revalidatePath("/", "layout")
  if (data.session) {
    redirect(destination)
  }
  return { ok: true, needsEmail: true }
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
  if (!parsed.success) return { error: "invalid_input" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

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
