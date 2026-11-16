import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"

export type PublicProfile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export type MemberProfile = PublicProfile & {
  role: "member" | "admin"
}

const PUBLIC_PROFILE_COLUMNS = "id, username, display_name, bio, avatar_url, created_at"
const MEMBER_PROFILE_COLUMNS = `${PUBLIC_PROFILE_COLUMNS}, role`

export async function getSessionUserId() {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getCurrentProfile(): Promise<MemberProfile | null> {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("profiles")
    .select(MEMBER_PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle()

  return (data as MemberProfile | null) ?? null
}

export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = createPublicSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle()
  return (data as PublicProfile | null) ?? null
}
