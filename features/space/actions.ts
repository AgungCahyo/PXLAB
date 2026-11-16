"use server"

import { revalidatePath } from "next/cache"
import type { AuthErrorCode } from "@/lib/auth/errors"
import { canMutateSpaceElement } from "@/lib/auth/permissions"
import { getCurrentProfile, getSessionUserId } from "@/lib/auth/session"
import { href } from "@/lib/i18n"
import {
  SPACE_CANVAS_MAX,
  SPACE_PER_MEMBER_MAX,
  SPACE_PER_MEMBER_PER_HOUR,
  SPACE_SIZE,
} from "@/lib/site"
import { createServerSupabase } from "@/lib/supabase/server"
import {
  addSpaceElementSchema,
  moveSpaceElementSchema,
  parseSpaceContentJson,
  spaceIdSchema,
} from "@/lib/validations/space"
import {
  countActiveSpaceElements,
  countOwnActiveSpaceElements,
  countOwnSpaceElementsSince,
  getOwnedSpaceElement,
} from "@/features/space/queries"

export type SpaceActionState = { error: AuthErrorCode } | { ok: true } | null

function revalidateSpace() {
  revalidatePath(href("id", "/space"))
  revalidatePath(href("en", "/space"))
}

function hourAgoIso() {
  return new Date(Date.now() - 60 * 60 * 1000).toISOString()
}

export async function addSpaceElementAction(
  _prev: SpaceActionState,
  formData: FormData,
): Promise<SpaceActionState> {
  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const rawContent = formData.get("content")
  const contentParsed =
    typeof rawContent === "string"
      ? parseSpaceContentJson(rawContent)
      : { success: false as const, error: "invalid_input" as const }
  if (!contentParsed.success) {
    return { error: contentParsed.error === "payload_too_large" ? "payload_too_large" : "invalid_input" }
  }

  const parsed = addSpaceElementSchema.safeParse({
    element_type: formData.get("element_type"),
    position_x: Number(formData.get("position_x")),
    position_y: Number(formData.get("position_y")),
    width: formData.get("width") ? Number(formData.get("width")) : undefined,
    height: formData.get("height") ? Number(formData.get("height")) : undefined,
    content: contentParsed.data,
  })
  if (!parsed.success) return { error: "invalid_input" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const [own, recent, total] = await Promise.all([
    countOwnActiveSpaceElements(),
    countOwnSpaceElementsSince(hourAgoIso()),
    countActiveSpaceElements(),
  ])
  if (own >= SPACE_PER_MEMBER_MAX || recent >= SPACE_PER_MEMBER_PER_HOUR || total >= SPACE_CANVAS_MAX) {
    return { error: "limit_reached" }
  }

  const { error } =
    parsed.data.element_type === "text"
      ? await supabase.from("space_elements").insert({
          user_id: profile.id,
          element_type: "text",
          position_x: parsed.data.position_x,
          position_y: parsed.data.position_y,
          content: parsed.data.content,
        })
      : await supabase.from("space_elements").insert({
          user_id: profile.id,
          element_type: "shape",
          position_x: parsed.data.position_x,
          position_y: parsed.data.position_y,
          width: parsed.data.width,
          height: parsed.data.height ?? null,
          content: parsed.data.content,
        })
  if (error) return { error: "invalid_input" }

  revalidateSpace()
  return { ok: true }
}

export async function moveSpaceElementAction(
  _prev: SpaceActionState,
  formData: FormData,
): Promise<SpaceActionState> {
  const parsed = moveSpaceElementSchema.safeParse({
    id: formData.get("id"),
    position_x: Number(formData.get("position_x")),
    position_y: Number(formData.get("position_y")),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedSpaceElement(parsed.data.id)
  if (!existing) return { error: "not_found" }
  if (!canMutateSpaceElement(userId, existing.user_id)) return { error: "forbidden" }

  let x = parsed.data.position_x
  let y = parsed.data.position_y
  if (existing.element_type === "shape" && existing.content && "shape" in existing.content) {
    if (existing.content.shape === "rectangle" && existing.width && existing.height) {
      x = Math.min(x, SPACE_SIZE - existing.width)
      y = Math.min(y, SPACE_SIZE - existing.height)
    }
    if (existing.content.shape === "circle" && existing.width) {
      const r = existing.width / 2
      x = Math.min(Math.max(x, r), SPACE_SIZE - r)
      y = Math.min(Math.max(y, r), SPACE_SIZE - r)
    }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("space_elements")
    .update({ position_x: x, position_y: y })
    .eq("id", existing.id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }
  revalidateSpace()
  return { ok: true }
}

export async function deleteSpaceElementAction(formData: FormData): Promise<SpaceActionState> {
  const idParsed = spaceIdSchema.safeParse(formData.get("id"))
  if (!idParsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedSpaceElement(idParsed.data)
  if (!existing) return { error: "not_found" }
  if (!canMutateSpaceElement(userId, existing.user_id)) return { error: "forbidden" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("space_elements")
    .delete()
    .eq("id", existing.id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }
  revalidateSpace()
  return { ok: true }
}
