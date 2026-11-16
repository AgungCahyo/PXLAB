import { createClient } from "@supabase/supabase-js"
import { getSupabaseEnv } from "@/lib/supabase/env"

/** Cookie-less anon client for public reads. Do not use for mutations. */
export function createPublicSupabase() {
  const env = getSupabaseEnv()
  if (!env) return null
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
