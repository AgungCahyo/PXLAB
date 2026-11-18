"use server"

import { revalidatePath } from "next/cache"
import { canEditProfile } from "@/lib/auth/permissions"
import { getProfileByUsername, getSessionUserId } from "@/lib/auth/session"
import type { AuthErrorCode } from "@/lib/auth/errors"
import { defaultAvatarConfig, isAvatarConfig } from "@/lib/avatar-gen"
import { href, isLang, type Lang } from "@/lib/i18n"
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarObjectPath,
  isAvatarMimeType,
} from "@/lib/site"
import { createServerSupabase } from "@/lib/supabase/server"
import { displayNameSchema, parseProfileUpdate, usernameSchema } from "@/lib/validations/profile"

export type ProfileActionState = { error: AuthErrorCode } | { ok: true } | null

function langFromForm(formData: FormData): Lang {
  return isLang(String(formData.get("lang") ?? "")) ? (formData.get("lang") as Lang) : "id"
}

type OwnProfileGate =
  | { ok: true; userId: string; supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>; username: string }
  | { ok: false; error: AuthErrorCode }

async function requireOwnProfile(): Promise<OwnProfileGate> {
  const userId = await getSessionUserId()
  if (!userId) return { ok: false, error: "not_authenticated" }

  const supabase = await createServerSupabase()
  if (!supabase) return { ok: false, error: "not_configured" }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle()

  if (!existing || !canEditProfile(userId, existing.id)) {
    return { ok: false, error: "forbidden" }
  }

  return {
    ok: true,
    userId,
    supabase,
    username: (existing.username as string | null) ?? "",
  }
}

function revalidateProfilePaths(lang: Lang, username: string) {
  revalidatePath(href(lang, "/settings"))
  revalidatePath(href(lang, "/welcome"))
  if (username) revalidatePath(href(lang, `/u/${username}`))
  revalidatePath(href(lang, "/dashboard"))
}

export async function completeOnboardingAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const lang = langFromForm(formData)

  const usernameParsed = usernameSchema.safeParse(formData.get("username"))
  const displayParsed = displayNameSchema.safeParse(formData.get("displayName"))
  if (!usernameParsed.success) {
    const issue = usernameParsed.error.issues[0]?.message
    if (issue === "username_reserved") return { error: "username_reserved" }
    return { error: "username_format" }
  }
  if (!displayParsed.success) return { error: "invalid_input" }

  const gate = await requireOwnProfile()
  if (!gate.ok) return { error: gate.error }
  const { userId, supabase } = gate

  const taken = await getProfileByUsername(usernameParsed.data)
  if (taken && taken.id !== userId) return { error: "username_taken" }

  const rawConfig = String(formData.get("avatarConfig") ?? "").trim()
  let avatarConfig = defaultAvatarConfig(userId)
  if (rawConfig) {
    try {
      const parsed = JSON.parse(rawConfig) as unknown
      if (isAvatarConfig(parsed)) avatarConfig = parsed
    } catch {
      // Keep deterministic default when payload is malformed.
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: usernameParsed.data,
      display_name: displayParsed.data,
      avatar_config: avatarConfig,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    if (error.code === "23505") return { error: "username_taken" }
    if (error.message.includes("username_format")) return { error: "username_format" }
    if (error.message.includes("username_reserved")) return { error: "username_reserved" }
    return { error: "invalid_input" }
  }

  revalidatePath("/", "layout")
  revalidateProfilePaths(lang, usernameParsed.data)
  return { ok: true }
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const lang = langFromForm(formData)

  const parsed = parseProfileUpdate({
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? "",
  })
  if (!parsed.success) {
    const issue =
      "error" in parsed && typeof parsed.error === "string"
        ? parsed.error
        : parsed.error.issues[0]?.message
    if (issue === "role_forbidden") return { error: "forbidden" }
    if (issue === "username_reserved") return { error: "username_reserved" }
    if (issue === "username_format") return { error: "username_format" }
    return { error: "invalid_input" }
  }

  const gate = await requireOwnProfile()
  if (!gate.ok) return { error: gate.error }
  const { userId, supabase } = gate

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ? parsed.data.bio : null,
    })
    .eq("id", userId)

  if (error) {
    if (error.code === "23505") return { error: "username_taken" }
    if (error.message.includes("username_format")) return { error: "username_format" }
    if (error.message.includes("username_reserved")) return { error: "username_reserved" }
    return { error: "invalid_input" }
  }

  revalidateProfilePaths(lang, parsed.data.username)
  return { ok: true }
}

export async function uploadAvatarAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const lang = langFromForm(formData)
  const gate = await requireOwnProfile()
  if (!gate.ok) return { error: gate.error }
  const { userId, supabase, username } = gate

  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0) return { error: "invalid_input" }
  if (file.size > AVATAR_MAX_BYTES) return { error: "payload_too_large" }
  if (!isAvatarMimeType(file.type)) return { error: "invalid_input" }

  const path = avatarObjectPath(userId)
  const uploaded = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  })
  if (uploaded.error) return { error: "invalid_input" }

  const { data: publicUrl } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
  if (error) return { error: "invalid_input" }

  revalidateProfilePaths(lang, username)
  return { ok: true }
}

export async function removeAvatarAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const lang = langFromForm(formData)
  const gate = await requireOwnProfile()
  if (!gate.ok) return { error: gate.error }
  const { userId, supabase, username } = gate

  const path = avatarObjectPath(userId)
  await supabase.storage.from(AVATAR_BUCKET).remove([path])

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", userId)
  if (error) return { error: "invalid_input" }

  revalidateProfilePaths(lang, username)
  return { ok: true }
}
