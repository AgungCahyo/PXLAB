"use server"

import { revalidatePath } from "next/cache"
import type { AuthErrorCode } from "@/lib/auth/errors"
import { canAccessAdmin, isAdminRole } from "@/lib/auth/permissions"
import { getCurrentProfile } from "@/lib/auth/session"
import { href } from "@/lib/i18n"
import type { ReportTargetType } from "@/lib/site"
import { createServerSupabase } from "@/lib/supabase/server"
import { moderateReportSchema } from "@/lib/validations/community"

export type ModerationActionState = { error: AuthErrorCode } | { ok: true } | null

function revalidateModeration(
  targetType: ReportTargetType,
  targetId: string,
  extra?: { creationId?: string; username?: string },
) {
  revalidatePath(href("id", "/admin"))
  revalidatePath(href("en", "/admin"))
  if (targetType === "creation") {
    revalidatePath(href("id", `/creation/${targetId}`))
    revalidatePath(href("en", `/creation/${targetId}`))
    revalidatePath(href("id", "/explore"))
    revalidatePath(href("en", "/explore"))
  }
  if (targetType === "comment" && extra?.creationId) {
    revalidatePath(href("id", `/creation/${extra.creationId}`))
    revalidatePath(href("en", `/creation/${extra.creationId}`))
  }
  if (targetType === "space_element") {
    revalidatePath(href("id", "/space"))
    revalidatePath(href("en", "/space"))
  }
  if (extra?.username) {
    revalidatePath(href("id", `/u/${extra.username}`))
    revalidatePath(href("en", `/u/${extra.username}`))
  }
}

async function requireAdmin() {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false as const, error: "not_authenticated" as const }
  if (!canAccessAdmin(isAdminRole(profile.role))) return { ok: false as const, error: "forbidden" as const }
  const supabase = await createServerSupabase()
  if (!supabase) return { ok: false as const, error: "not_configured" as const }
  return { ok: true as const, profile, supabase }
}

export async function moderateReportAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const parsed = moderateReportSchema.safeParse({
    id: formData.get("id"),
    intent: formData.get("intent"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error }

  const { data: report, error: reportError } = await auth.supabase
    .from("reports")
    .select("id, target_type, target_id, status")
    .eq("id", parsed.data.id)
    .maybeSingle()
  if (reportError || !report) return { error: "not_found" }

  const targetType = report.target_type as ReportTargetType
  const targetId = report.target_id as string
  let creationId: string | undefined
  let username: string | undefined

  if (targetType === "comment") {
    const { data: comment } = await auth.supabase
      .from("comments")
      .select("creation_id")
      .eq("id", targetId)
      .maybeSingle()
    creationId = (comment?.creation_id as string | undefined) ?? undefined
  }
  if (targetType === "creation") {
    const { data: creation } = await auth.supabase
      .from("creations")
      .select("profiles!creations_user_id_fkey (username)")
      .eq("id", targetId)
      .maybeSingle()
    const profile = Array.isArray(creation?.profiles) ? creation?.profiles[0] : creation?.profiles
    username = profile && "username" in profile ? String(profile.username) : undefined
  }

  if (parsed.data.intent === "hide" || parsed.data.intent === "restore") {
    const rpcError = await applyHideRestore(auth.supabase, targetType, targetId, parsed.data.intent)
    if (rpcError) return { error: rpcError }
  }

  if (parsed.data.intent === "review" || parsed.data.intent === "resolve" || parsed.data.intent === "hide") {
    const nextStatus = parsed.data.intent === "review" ? "reviewed" : "resolved"
    const { error } = await auth.supabase.rpc("admin_set_report_status", {
      p_id: report.id,
      p_status: nextStatus,
    })
    if (error) return { error: mapRpcError(error) }
  }

  revalidateModeration(targetType, targetId, { creationId, username })
  return { ok: true }
}

async function applyHideRestore(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
  targetType: ReportTargetType,
  targetId: string,
  intent: "hide" | "restore",
): Promise<AuthErrorCode | null> {
  if (targetType === "creation") {
    let next = "hidden"
    if (intent === "restore") {
      const { data } = await supabase
        .from("creations")
        .select("published_at")
        .eq("id", targetId)
        .maybeSingle()
      next = data?.published_at ? "published" : "draft"
    }
    const { error } = await supabase.rpc("admin_set_creation_status", {
      p_id: targetId,
      p_status: next,
    })
    return error ? mapRpcError(error) : null
  }
  if (targetType === "comment") {
    const { error } = await supabase.rpc("admin_set_comment_status", {
      p_id: targetId,
      p_status: intent === "hide" ? "hidden" : "published",
    })
    return error ? mapRpcError(error) : null
  }
  const { error } = await supabase.rpc("admin_set_space_element_status", {
    p_id: targetId,
    p_status: intent === "hide" ? "hidden" : "active",
  })
  return error ? mapRpcError(error) : null
}

function mapRpcError(error: { message?: string }): AuthErrorCode {
  const message = (error.message ?? "").toLowerCase()
  if (message.includes("forbidden")) return "forbidden"
  if (message.includes("not_found")) return "not_found"
  return "invalid_input"
}
