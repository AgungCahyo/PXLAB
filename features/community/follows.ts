import { connection } from "next/server"
import { getSessionUserId } from "@/lib/auth/session"
import { createServerSupabase } from "@/lib/supabase/server"

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId || followerId === followingId) return false
  const supabase = await createServerSupabase()
  if (!supabase) return false
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle()
  return Boolean(data)
}

export async function listFollowingIds(followerId: string): Promise<string[]> {
  await connection()
  const supabase = await createServerSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId)
    .order("created_at", { ascending: false })
    .limit(500)
  return (data ?? []).map((row) => row.following_id as string)
}

export async function countOwnFollowsSince(sinceIso: string): Promise<number> {
  const userId = await getSessionUserId()
  if (!userId) return 0
  const supabase = await createServerSupabase()
  if (!supabase) return 0
  const { count } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("follower_id", userId)
    .gt("created_at", sinceIso)
  return count ?? 0
}
