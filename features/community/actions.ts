"use server"

import { revalidatePath } from "next/cache"
import type { AuthErrorCode } from "@/lib/auth/errors"
import { takeRateLimit } from "@/lib/auth/rate-limit"
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
  FOLLOW_PER_HOUR,
  REACTION_PER_HOUR,
  REACTION_TYPE,
  REPORT_PER_HOUR,
} from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import {
  addCommentSchema,
  commentIdSchema,
  editCommentSchema,
  desiredFromForm,
  followCreatorSchema,
  submitReportSchema,
  toggleReactionSchema,
} from "@/lib/validations/community"
import { getPublishedCreation } from "@/features/creations/queries"
import { countOwnFollowsSince } from "@/features/community/follows"
import {
  countCommentsOnCreation,
  countOwnCommentsSince,
  countOwnReportsSince,
  getOwnedComment,
  getOwnReaction,
  getPublishedComment,
  getReactionSummary,
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
  | {
      ok: true
      comment?: PostedComment
      /** Authoritative interaction state returned by the guarded RPC. */
      liked?: boolean
      following?: boolean
      count?: number
    }
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

function isMissingInteractionRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function|schema cache|undefined function/i.test(error.message ?? "")
  )
}

type InteractionRpcResult = {
  error?: string
  found?: boolean
  limited?: boolean
  self?: boolean
  changed?: boolean
  liked?: boolean
  following?: boolean
  count?: number
}

function readInteractionResult(value: unknown): InteractionRpcResult {
  if (!value || typeof value !== "object") return {}
  const result = value as Record<string, unknown>
  return {
    error: typeof result.error === "string" ? result.error : undefined,
    found: typeof result.found === "boolean" ? result.found : undefined,
    limited: result.limited === true,
    self: result.self === true,
    changed: typeof result.changed === "boolean" ? result.changed : undefined,
    liked: typeof result.liked === "boolean" ? result.liked : undefined,
    following: typeof result.following === "boolean" ? result.following : undefined,
    count: typeof result.count === "number" ? result.count : undefined,
  }
}

function rpcAuthError(result: InteractionRpcResult): boolean {
  return result.error === "not_authenticated"
}

async function revalidateFollowTargets(username?: string | null, targetUserId?: string | null) {
  revalidatePath(href("id", "/explore"))
  revalidatePath(href("en", "/explore"))
  revalidatePath(href("id", "/creators"))
  revalidatePath(href("en", "/creators"))
  revalidatePath(href("id", "/home"))
  revalidatePath(href("en", "/home"))
  if (username) {
    revalidatePath(href("id", `/u/${username}`))
    revalidatePath(href("en", `/u/${username}`))
  }
  if (targetUserId) {
    const publicClient = createPublicSupabase()
    const { data } = publicClient
      ? await publicClient
          .from("creations")
          .select("id")
          .eq("user_id", targetUserId)
          .eq("status", "published")
          .limit(100)
      : { data: null }
    for (const creation of data ?? []) {
      revalidatePath(href("id", `/creation/${creation.id}`))
      revalidatePath(href("en", `/creation/${creation.id}`))
    }
  }
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
    desired: desiredFromForm(formData),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const creation = await getPublishedCreation(parsed.data.creation_id)
  if (!creation) return { error: "not_found" }
  if (!canReactToCreation({ sessionUserId: profile.id, creationStatus: creation.status })) {
    return { error: "forbidden" }
  }

  // Best-effort process guard; the RPC below keeps a durable per-user window.
  if (!takeRateLimit(`reaction:${profile.id}`, REACTION_PER_HOUR)) {
    return { error: "limit_reached" }
  }

  const desired = parsed.data.desired === undefined ? undefined : parsed.data.desired === "true"
  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { data, error } = await supabase.rpc("set_reaction_state", {
    p_creation_id: creation.id,
    p_desired: desired ?? null,
    p_limit: REACTION_PER_HOUR,
  })
  if (!error) {
    const result = readInteractionResult(data)
    if (rpcAuthError(result)) return { error: "not_authenticated" }
    if (result.error) return { error: "invalid_input" }
    if (result.found === false) return { error: "not_found" }
    if (result.limited) return { error: "limit_reached" }
    revalidatePath(href("id", "/liked"))
    revalidatePath(href("en", "/liked"))
    return { ok: true, liked: result.liked ?? desired, count: result.count }
  }
  if (!isMissingInteractionRpc(error)) return { error: "invalid_input" }

  // Fallback until the guardrail migration is applied: explicit desired state
  // plus the existing unique constraint still prevents contradictory rows.
  const existing = await getOwnReaction(creation.id)
  const shouldLike = desired ?? !existing
  if (shouldLike) {
    const { error: insertError } = await supabase.from("reactions").insert({
      user_id: profile.id,
      creation_id: creation.id,
      reaction_type: REACTION_TYPE,
    })
    if (insertError && insertError.code !== "23505") return { error: "invalid_input" }
  } else if (existing) {
    const { error: deleteError } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", profile.id)
    if (deleteError) return { error: "invalid_input" }
  }

  const summary = await getReactionSummary(creation.id, profile.id)
  revalidatePath(href("id", "/liked"))
  revalidatePath(href("en", "/liked"))
  return { ok: true, liked: summary.appreciated, count: summary.count }
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

async function mutateFollowState(
  formData: FormData,
  defaultDesired: boolean,
): Promise<CommunityActionState> {
  const parsed = followCreatorSchema.safeParse({
    user_id: formData.get("user_id"),
    desired: desiredFromForm(formData),
  })
  if (!parsed.success) return { error: "invalid_input" }
  if (parsed.data.desired !== undefined) defaultDesired = parsed.data.desired === "true"

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }
  if (parsed.data.user_id === profile.id) return { error: "invalid_input" }

  const publicClient = createPublicSupabase()
  if (!publicClient) return { error: "not_configured" }
  const { data: target } = await publicClient
    .from("profiles")
    .select("id, username")
    .eq("id", parsed.data.user_id)
    .maybeSingle()
  if (!target) return { error: "not_found" }

  // Best-effort process guard; the RPC keeps a durable history that unfollow
  // cannot erase, so follow -> unfollow spam cannot reset the allowance.
  if (!takeRateLimit(`follow:${profile.id}`, FOLLOW_PER_HOUR)) {
    return { error: "limit_reached" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { data, error } = await supabase.rpc("set_follow_state", {
    p_target_user_id: parsed.data.user_id,
    p_desired: defaultDesired,
    p_limit: FOLLOW_PER_HOUR,
  })
  if (!error) {
    const result = readInteractionResult(data)
    if (rpcAuthError(result)) return { error: "not_authenticated" }
    if (result.error) return { error: "invalid_input" }
    if (result.found === false) return { error: "not_found" }
    if (result.self) return { error: "invalid_input" }
    if (result.limited) return { error: "limit_reached" }
    await revalidateFollowTargets(target.username as string, target.id as string)
    return { ok: true, following: result.following ?? defaultDesired }
  }
  if (!isMissingInteractionRpc(error)) return { error: "invalid_input" }

  // Fallback until the guardrail migration is applied. The primary key makes
  // duplicate follows idempotent; the current-row count is only a stopgap.
  const recent = await countOwnFollowsSince(hourAgoIso())
  if (recent >= FOLLOW_PER_HOUR) return { error: "limit_reached" }

  if (defaultDesired) {
    const { error: insertError } = await supabase.from("follows").insert({
      follower_id: profile.id,
      following_id: parsed.data.user_id,
    })
    if (insertError && insertError.code !== "23505") return { error: "invalid_input" }
  } else {
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", profile.id)
      .eq("following_id", parsed.data.user_id)
    if (deleteError) return { error: "invalid_input" }
  }

  await revalidateFollowTargets(target.username as string, target.id as string)
  return { ok: true, following: defaultDesired }
}

export async function followCreatorAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  return mutateFollowState(formData, true)
}

export async function unfollowCreatorAction(
  _prev: CommunityActionState,
  formData: FormData,
): Promise<CommunityActionState> {
  return mutateFollowState(formData, false)
}
