// Supabase Edge Function (Deno). Deploy with:
//   supabase functions deploy delete-account
// Requires SUPABASE_SERVICE_ROLE_KEY in the function's environment — never in
// the Next.js app or its public env vars.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const authorization = req.headers.get("Authorization") ?? ""
  const token = authorization.replace(/^Bearer\s+/i, "").trim()
  if (!token) return json({ error: "missing_token" }, 401)

  const url = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !anonKey || !serviceKey) return json({ error: "not_configured" }, 500)

  // Establish the caller with their own JWT before using any privileged key.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await caller.auth.getUser(token)
  if (error || !data.user) return json({ error: "unauthorized" }, 401)

  // profiles and related content use ON DELETE CASCADE from auth.users.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: "delete_failed" }, 500)

  return json({ ok: true })
})
