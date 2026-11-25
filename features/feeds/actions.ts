"use server"

import { revalidatePath } from "next/cache"

import { getCurrentProfile } from "@/lib/auth/session"
import { href } from "@/lib/i18n"
import { createServerSupabase } from "@/lib/supabase/server"
import { creationIdSchema } from "@/lib/validations/creation"

export type FeedActionState =
  | { ok: true; saved?: boolean; archived?: boolean }
  | { error: "invalid_input" | "forbidden" | "not_found" | "migration_required" | "unavailable" }
  | null

function migrationMissing(code: string | undefined, message: string): boolean {
  return (
    code === "42P01" ||
    code === "42703" ||
    /saved_creations|archived_at/.test(message)
  )
}

function revalidateFeeds(creationId?: string) {
  const paths = [
    "/home",
    "/saved",
    "/liked",
    "/archive",
    "/activity",
    "/insights",
    "/dashboard",
    ...(creationId ? [`/creation/${creationId}`] : []),
  ]
  // Both locales are revalidated: the action can be submitted from either.
  for (const locale of ["id", "en"] as const) {
    for (const path of paths) revalidatePath(href(locale, path))
  }
}

export async function setSavedStateAction(
  _state: FeedActionState,
  formData: FormData,
): Promise<FeedActionState> {
  const parsed = creationIdSchema.safeParse(formData.get("creation_id"))
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "forbidden" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "unavailable" }

  const desired = formData.get("desired") === "true"
  const error = desired
    ? (
        await supabase
          .from("saved_creations")
          .upsert(
            { user_id: profile.id, creation_id: parsed.data },
            { onConflict: "user_id,creation_id" },
          )
      ).error
    : (
        await supabase
          .from("saved_creations")
          .delete()
          .eq("user_id", profile.id)
          .eq("creation_id", parsed.data)
      ).error

  if (error) {
    return migrationMissing(error.code, error.message)
      ? { error: "migration_required" }
      : { error: "unavailable" }
  }

  revalidateFeeds(parsed.data)
  return { ok: true, saved: desired }
}

export async function setArchiveStateAction(
  _state: FeedActionState,
  formData: FormData,
): Promise<FeedActionState> {
  const parsed = creationIdSchema.safeParse(formData.get("creation_id"))
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "forbidden" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "unavailable" }

  const { data: creation, error: lookupError } = await supabase
    .from("creations")
    .select("user_id")
    .eq("id", parsed.data)
    .maybeSingle()
  if (lookupError || !creation) return { error: "not_found" }
  if (creation.user_id !== profile.id) return { error: "forbidden" }

  const desired = formData.get("desired") === "true"
  const { error } = await supabase
    .from("creations")
    .update({ archived_at: desired ? new Date().toISOString() : null })
    .eq("id", parsed.data)
    .eq("user_id", profile.id)

  if (error) {
    return migrationMissing(error.code, error.message)
      ? { error: "migration_required" }
      : { error: "unavailable" }
  }

  revalidateFeeds(parsed.data)
  return { ok: true, archived: desired }
}
