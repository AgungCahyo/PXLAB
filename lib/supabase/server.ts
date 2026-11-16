import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { connection } from "next/server"
import { getSupabaseEnv } from "@/lib/supabase/env"

export async function createServerSupabase() {
  const env = getSupabaseEnv()
  if (!env) return null

  await connection()
  const cookieStore = await cookies()

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot set cookies. middleware/proxy refreshes the session.
        }
      },
    },
  })
}
