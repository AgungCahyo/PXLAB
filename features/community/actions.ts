"use server"

import { revalidatePath } from "next/cache"
import type { AuthErrorCode } from "@/lib/auth/errors"
import {
  canCommentOnCreation,
  canDeleteComment,
  canEditComment,
  canReactToCreation,
  canReportTarget,
} from "@/lib/auth/permissions"
import { getCurrentProfile, getSessionUserId } from "@/lib/auth/session"
import { href } from "@/lib/i18n"
import {
  COMMENT_PER_CREATION_MAX,
  COMMENT_PER_HOUR,
  COMMENTS_PAGE_SIZE,
  REACTION_TYPE,
  REPORT_PER_HOUR,
} from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import {
  addCommentSchema,
  commentIdSchema,
  editCommentSchema,
  submitReportSchema,
  toggleReactionSchema,
} from "@/lib/validations/community"
import { getPublishedCreation } from "@/features/creations/queries"
import {
  countCommentsOnCreation,
  countOwnCommentsSince,
  countOwnReportsSince,
  getOwnedComment,
  getOwnReaction,
  getPublishedComment,
  listConversation,
  type ConversationRoot,
} from "@/features/community/queries"

export type PostedComment = {
  id: string
  user_id: string
  creation_id: string
  content: string
  parent_id: string | null
  created_at: string
  updated_at: string | null
}

export type CommunityActionState =
  | { error: AuthErrorCode }
  | { ok: true; comment?: PostedComment }
  | null

function hourAgoIso() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString()
}

function revalidateCreation(id: string) {
  revalidatePath(href("id", `/creation/${id}`))
  revalidatePath(href("en", `/creation/${id}`))
}

function revalidateSpace() {
  revalidatePath(href("id", "/space"))
  revalidatePath(href("en", "/space"))
}

async function targetIsVisible(targetType: "creation" | "comment" | "space_element", targetId: string) {
  const supabase = createPublicSupabase()
  if (!supabase) return false
  if (targetType === "creation") {
    const { data } = await supabase
      .from("creations")
      .select("id")
      .eq("id", targetId)
      .eq("status", "published")
      .maybeSingle()
    return Boolean(data)
  }
  if (targetType === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("id")
      .eq("id", targetId)
      .eq("status", "published")
      .maybeSingle()
    return Boolean(data)
  }
  const { data } = await supabase
    .from("space_elements")
    .select("id")
    .eq("id", targetId)
    .eq("status", "active")
    .maybeSingle()
  return Boolean(data)
}

function parentFromForm(formData: FormData) {
  const raw = formData.get("parent_id")
  return typeof raw === "string" && raw.length > 0 ? raw : undefined
}

export async function addCommentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parentId = parentFromForm(formData)
  const parsed = addCommentSchema.safeParse({
    creation_id: formData.get("creation_id"),
    content: formData.get("content"),
    ...(parentId ? { parent_id: parentId } : {}),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const creation = await getPublishedCreation(parsed.data.creation_id)
  if (!creation) return { error: "not_found" }
  if (!canCommentOnCreation({ sessionUserId: profile.id, creationStatus: creation.status })) {
    return { error: "forbidden" }
  }

  if (parsed.data.parent_id) {
    const parent = await getPublishedComment(parsed.data.parent_id)
    if (!parent || parent.creation_id !== creation.id) return { error: "invalid_input" }
    if (parent.parent_id) return { error: "invalid_input" }
  }

  const [recent, total] = await Promise.all([
    countOwnCommentsSince(hourAgoIso()),
    countCommentsOnCreation(creation.id),
  ])
  if (recent >= COMMENT_PER_HOUR || total >= COMMENT_PER_CREATION_MAX) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const insert: {
    user_id: string
    creation_id: string
    content: string
    parent_id?: string
  } = {
    user_id: profile.id,
    creation_id: creation.id,
    content: parsed.data.content,
  }
  if (parsed.data.parent_id) insert.parent_id = parsed.data.parent_id

  const { data, error } = await supabase
    .from("comments")
    .insert(insert)
    .select("id, user_id, creation_id, content, created_at")
    .single()
  if (error || !data) return { error: "invalid_input" }

  revalidateCreation(creation.id)
  return {
    ok: true,
    comment: {
      id: data.id as string,
      user_id: data.user_id as string,
      creation_id: data.creation_id as string,
      content: data.content as string,
      parent_id: parsed.data.parent_id ?? null,
      created_at: data.created_at as string,
      updated_at: (data.created_at as string | null) ?? null,
    },
  }
}

export async function editCommentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = editCommentSchema.safeParse({
    id: formData.get("id"),
    content: formData.get("content"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedComment(parsed.data.id)
  if (!existing) return { error: "not_found" }
  if (!canEditComment(userId, existing.user_id as string)) return { error: "forbidden" }
  if (existing.status !== "published") return { error: "forbidden" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("comments")
    .update({
      content: parsed.data.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .eq("user_id", userId)
  if (error) return { error: "invalid_input" }

  revalidateCreation(existing.creation_id as string)
  return { ok: true }
}

export async function loadEarlierConversationAction(
  creationId: string,
  before: string,
): Promise<{ roots: ConversationRoot[]; hasEarlier: boolean }> {
  const parsed = commentIdSchema.safeParse(creationId)
  if (!parsed.success || !before) return { roots: [], hasEarlier: false }
  const result = await listConversation({
    creationId: parsed.data,
    before,
    limit: COMMENTS_PAGE_SIZE,
  })
  return { roots: result.roots, hasEarlier: result.hasEarlier }
}

export async function deleteCommentAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = commentIdSchema.safeParse(formData.get("id"))
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedComment(parsed.data)
  if (!existing) return { error: "not_found" }
  if (!canDeleteComment(userId, existing.user_id as string)) return { error: "forbidden" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", userId)
  if (error) return { error: "invalid_input" }

  revalidateCreation(existing.creation_id as string)
  return { ok: true }
}

export async function toggleAppreciationAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const parsed = toggleReactionSchema.safeParse({
    creation_id: formData.get("creation_id"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const creation = await getPublishedCreation(parsed.data.creation_id)
  if (!creation) return { error: "not_found" }
  if (!canReactToCreation({ sessionUserId: profile.id, creationStatus: creation.status })) {
    return { error: "forbidden" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const existing = await getOwnReaction(creation.id)
  if (existing) {
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", profile.id)
    if (error) return { error: "invalid_input" }
  } else {
    const { error } = await supabase.from("reactions").insert({
      user_id: profile.id,
      creation_id: creation.id,
      reaction_type: REACTION_TYPE,
    })
    if (error) return { error: "invalid_input" }
  }

  // Skip revalidatePath: the client already applied optimistic UI.
  // Refreshing the whole creation route made navigation feel like a reload.
  return { ok: true }
}

export async function submitReportAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  const detailsRaw = formData.get("details")
  const parsed = submitReportSchema.safeParse({
    target_type: formData.get("target_type"),
    target_id: formData.get("target_id"),
    reason: formData.get("reason"),
    details: typeof detailsRaw === "string" ? detailsRaw : undefined,
  })
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const visible = await targetIsVisible(parsed.data.target_type, parsed.data.target_id)
  if (!canReportTarget({ sessionUserId: profile.id, targetVisible: visible })) {
    return { error: visible ? "forbidden" : "not_found" }
  }

  const recent = await countOwnReportsSince(hourAgoIso())
  if (recent >= REPORT_PER_HOUR) return { error: "limit_reached" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase.from("reports").insert({
    reporter_id: profile.id,
    target_type: parsed.data.target_type,
    target_id: parsed.data.target_id,
    reason: parsed.data.reason,
    details: parsed.data.details ? parsed.data.details : null,
  })
  if (error) {
    const message = (error.message ?? "").toLowerCase()
    const code = error.code ?? ""
    if (code === "23505" || message.includes("duplicate") || message.includes("reports_pending_unique")) {
      return { ok: true }
    }
    return { error: "invalid_input" }
  }

  if (parsed.data.target_type === "space_element") revalidateSpace()
  if (parsed.data.target_type === "creation") revalidateCreation(parsed.data.target_id)
  return { ok: true }
}
