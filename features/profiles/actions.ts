"use server"

import { revalidatePath } from "next/cache"
import { canEditProfile } from "@/lib/auth/permissions"
import { getSessionUserId } from "@/lib/auth/session"
import { href, isLang, type Lang } from "@/lib/i18n"
import { createServerSupabase } from "@/lib/supabase/server"
import { parseProfileUpdate } from "@/lib/validations/profile"
import type { AuthErrorCode } from "@/lib/auth/errors"

export type ProfileActionState = { error: AuthErrorCode } | { ok: true } | null

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const lang: Lang = isLang(String(formData.get("lang") ?? ""))
    ? (formData.get("lang") as Lang)
    : "id"

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

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (!existing || !canEditProfile(userId, existing.id)) {
    return { error: "forbidden" }
  }

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

  revalidatePath(href(lang, "/settings"))
  revalidatePath(href(lang, `/u/${parsed.data.username}`))
  revalidatePath(href(lang, "/dashboard"))
  return { ok: true }
}
