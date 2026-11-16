import { connection } from "next/server"
import { getSessionUserId } from "@/lib/auth/session"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import type { SpaceContent } from "@/lib/validations/space"

export type SpaceElementRow = {
  id: string
  user_id: string
  element_type: "text" | "shape"
  content: SpaceContent
  position_x: number
  position_y: number
  width: number | null
  height: number | null
  status: "active" | "hidden"
  created_at: string
  author: { username: string; displayName: string | null }
}

type ProfileEmbed = { username: string; display_name: string | null }

const COLUMNS =
  "id, user_id, element_type, content, position_x, position_y, width, height, status, created_at"

function authorOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return {
    username: profile?.username ?? "member",
    displayName: profile?.display_name ?? null,
  }
}

function asRow(row: Record<string, unknown>): SpaceElementRow {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    element_type: row.element_type as "text" | "shape",
    content: row.content as SpaceContent,
    position_x: Number(row.position_x),
    position_y: Number(row.position_y),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    status: row.status as "active" | "hidden",
    created_at: row.created_at as string,
    author: authorOf(row as { profiles?: ProfileEmbed | ProfileEmbed[] | null }),
  }
}

export async function listActiveSpaceElements(): Promise<SpaceElementRow[]> {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return []

  const { data } = await supabase
    .from("space_elements")
    .select(`${COLUMNS}, profiles (username, display_name)`)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(800)

  return (data ?? []).map((row) => asRow(row as Record<string, unknown>))
}

export async function getOwnedSpaceElement(id: string): Promise<SpaceElementRow | null> {
  const userId = await getSessionUserId()
  if (!userId) return null
  const supabase = await createServerSupabase()
  if (!supabase) return null

  const { data } = await supabase
    .from("space_elements")
    .select(`${COLUMNS}, profiles (username, display_name)`)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  return data ? asRow(data as Record<string, unknown>) : null
}

export async function countOwnActiveSpaceElements() {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("space_elements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active")
  return count ?? 0
}

export async function countOwnSpaceElementsSince(iso: string) {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("space_elements")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", iso)
  return count ?? 0
}

export async function countActiveSpaceElements() {
  await connection()
  const supabase = createPublicSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("space_elements")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
  return count ?? 0
}
