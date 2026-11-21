import { parseAvatarConfig, type AvatarConfig } from "@/lib/avatar-gen"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"

export type PublicProfile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  avatar_config: AvatarConfig | null
  created_at: string
}

export type MemberProfile = Omit<PublicProfile, "username"> & {
  /** Null until identity onboarding completes. */
  username: string | null
  role: "member" | "admin"
  activity_seen_at: string | null
  onboarding_completed_at: string | null
}

const PUBLIC_PROFILE_COLUMNS =
  "id, username, display_name, bio, avatar_url, avatar_config, created_at"
const MEMBER_PROFILE_COLUMNS = `${PUBLIC_PROFILE_COLUMNS}, role, activity_seen_at, onboarding_completed_at`

function mapProfile<T extends { avatar_config?: unknown }>(
  row: T,
): T & { avatar_config: AvatarConfig | null } {
  return {
    ...row,
    avatar_config: parseAvatarConfig(row.avatar_config),
  }
}

export function needsOnboarding(profile: {
  onboarding_completed_at: string | null
} | null | undefined) {
  return !profile?.onboarding_completed_at
}

export async function getSessionUserId() {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function getCurrentAuthUser() {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ?? null
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

  return data ? (mapProfile(data) as MemberProfile) : null
}

export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = createPublicSupabase()
  if (!supabase) return null
  const { data } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle()
  if (!data?.username) return null
  return mapProfile(data) as PublicProfile
}
