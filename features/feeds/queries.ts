import { connection } from "next/server"

import {
  CARD_COLUMNS,
  cardFromRow,
  type CreationCard,
} from "@/features/creations/queries"
import { getSessionUserId } from "@/lib/auth/session"
import { createServerSupabase } from "@/lib/supabase/server"

const FEED_LIMIT = 60

async function cardsForIds(ids: string[]): Promise<CreationCard[]> {
  if (!ids.length) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []
  const { data } = await supabase
    .from("creations")
    .select(
      `${CARD_COLUMNS}, profiles!creations_user_id_fkey (username, display_name, avatar_url, avatar_config), archived_at`,
    )
    .in("id", ids)
    .eq("status", "published")
    .is("archived_at", null)
    .limit(FEED_LIMIT)

  const cards = (data ?? []).map((row) => cardFromRow(row))
  const byId = new Map(cards.map((card) => [card.id, card]))
  return ids.map((id) => byId.get(id)).filter((card): card is CreationCard => Boolean(card))
}

export async function listSavedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("saved_creations")
    .select("creation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return cardsForIds((data ?? []).map((row) => row.creation_id as string))
}

export async function listLikedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("reactions")
    .select("creation_id")
    .eq("user_id", userId)
    .eq("reaction_type", "appreciate")
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return cardsForIds((data ?? []).map((row) => row.creation_id as string))
}

export async function isCreationSaved(creationId: string): Promise<boolean> {
  const userId = await getSessionUserId()
  if (!userId) return false
  const supabase = await createServerSupabase()
  if (!supabase) return false

  const { data, error } = await supabase
    .from("saved_creations")
    .select("creation_id")
    .eq("user_id", userId)
    .eq("creation_id", creationId)
    .maybeSingle()
  return !error && Boolean(data)
}

export async function isCreationArchived(creationId: string): Promise<boolean> {
  const userId = await getSessionUserId()
  if (!userId) return false
  const supabase = await createServerSupabase()
  if (!supabase) return false

  const { data, error } = await supabase
    .from("creations")
    .select("archived_at")
    .eq("id", creationId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) return false
  return Boolean((data as { archived_at?: string | null } | null)?.archived_at)
}

/**
 * Archived works keep their published status but are hidden from public feeds.
 * Before the additive migration lands there is no archived work to show.
 */
export async function listArchivedCreations(): Promise<CreationCard[]> {
  await connection()
  const userId = await getSessionUserId()
  if (!userId) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("creations")
    .select(`${CARD_COLUMNS}, archived_at`)
    .eq("user_id", userId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(FEED_LIMIT)
  if (error) return []

  return (data ?? []).map((row) => cardFromRow(row))
}




