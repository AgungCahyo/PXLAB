import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) =>
  readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("interaction spam guardrails", () => {
  const actions = read("features/community/actions.ts")
  const migration = read("supabase/migrations/20261123000000_interaction_guardrails.sql")
  const validations = read("lib/validations/community.ts")
  const site = read("lib/site.ts")
  const follow = read("components/community/FollowButton.tsx")
  const appreciate = read("components/community/CreationCommunity.tsx")
  const feed = read("components/social/FeedPost.tsx")
  const intent = read("lib/social-like.ts")

  it("keeps optimistic UI on an explicit desired state, never a blind toggle", () => {
    expect(validations).toMatch(/desiredFieldSchema = z\.enum\(\["true", "false"\]\)/)
    expect(validations).toMatch(/export function desiredFromForm/)
    expect(validations).toMatch(/raw === "true" \|\| raw === "false" \? raw/)
    expect(actions).toMatch(/desired: desiredFromForm\(formData\)/)
    expect(actions).not.toMatch(/return raw === "true" \? true/)
    expect(validations).toMatch(/toggleReactionSchema[\s\S]*desired: desiredFieldSchema\.optional\(\)/)
    expect(validations).toMatch(/followCreatorSchema[\s\S]*desired: desiredFieldSchema\.optional\(\)/)
    expect(intent).toMatch(/export async function reconcileDesiredState/)
    for (const source of [follow, appreciate, feed]) {
      expect(source).toMatch(/reconcileDesiredState/)
      expect(source).toMatch(/formData\.set\("desired", String\(desired\)\)/)
    }
    expect(follow).not.toMatch(/disabled=\{pending\}/)
    expect(follow).not.toMatch(/followWorking/)
    expect(follow).toMatch(/\{following \? copy\.following\[lang\] : copy\.follow\[lang\]\}/)
    expect(
      appreciate.slice(
        appreciate.indexOf("function AppreciateForm"),
        appreciate.indexOf("function ShareButton"),
      ),
    ).not.toMatch(/disabled=\{pending\}/)
  })

  it("validates and rate limits both mutations on the server", () => {
    expect(site).toMatch(/REACTION_PER_HOUR = 60/)
    expect(site).toMatch(/FOLLOW_PER_HOUR = 40/)
    expect(actions).toMatch(/import \{ takeRateLimit \} from "@\/lib\/auth\/rate-limit"/)
    expect(actions).toMatch(/takeRateLimit\(`reaction:\$\{profile\.id\}`, REACTION_PER_HOUR\)/)
    expect(actions).toMatch(/takeRateLimit\(`follow:\$\{profile\.id\}`, FOLLOW_PER_HOUR\)/)
    expect(actions).toMatch(/if \(parsed\.data\.user_id === profile\.id\) return/)
    expect(actions).toMatch(/if \(result\.limited\) return \{ error: "limit_reached" \}/)
    expect(actions).toMatch(/rpcAuthError\(result\)/g)
  })

  it("mutates through guarded RPCs and treats duplicate state as success", () => {
    expect(actions).toMatch(/supabase\.rpc\("set_reaction_state"/)
    expect(actions).toMatch(/supabase\.rpc\("set_follow_state"/)
    expect(actions).toMatch(/p_desired: desired \?\? null/)
    expect(actions).toMatch(/p_desired: defaultDesired/)
    expect(actions).toMatch(/insertError\.code !== "23505"/)
    expect(actions).toMatch(/result\.liked \?\? desired/)
    expect(actions).toMatch(/result\.following \?\? defaultDesired/)
  })

  it("revalidates every surface that can show follow state", () => {
    expect(actions).toMatch(/async function revalidateFollowTargets/)
    expect(actions).toMatch(/revalidatePath\(href\("id", "\/home"\)\)/)
    expect(actions).toMatch(/revalidatePath\(href\("en", "\/home"\)\)/)
    expect(actions).toMatch(/revalidatePath\(href\("id", "\/creators"\)\)/)
    expect(actions).toMatch(/revalidatePath\(href\("en", "\/creators"\)\)/)
    expect(actions).toMatch(/\.from\("creations"\)\s*\.select\("id"\)/)
    expect(actions).toMatch(/revalidatePath\(href\("id", `\/creation\/\$\{creation\.id\}`\)\)/)
  })

  it("enforces spam limits atomically in the database", () => {
    expect(migration).toMatch(/create table if not exists public\.reaction_events/)
    expect(migration).toMatch(/create table if not exists public\.follow_events/)
    expect(migration).toMatch(/alter table public\.reaction_events enable row level security/)
    expect(migration).toMatch(/alter table public\.follow_events enable row level security/)
    expect(migration).toMatch(/revoke all on table public\.reaction_events from anon, authenticated/)
    expect(migration).toMatch(/revoke all on table public\.follow_events from anon, authenticated/)
    expect(migration).toMatch(/create or replace function public\.set_reaction_state/)
    expect(migration).toMatch(/create or replace function public\.set_follow_state/)
    expect(migration).toMatch(/security definer/)
    expect(migration).toMatch(/pg_advisory_xact_lock/)
    expect(migration).toMatch(/on conflict \(user_id, creation_id\) do nothing/)
    expect(migration).toMatch(/on conflict \(follower_id, following_id\) do nothing/)
    expect(migration).toMatch(/jsonb_build_object\(\s*'limited', true/)
    expect(migration).toMatch(/grant execute on function public\.set_reaction_state/)
    expect(migration).toMatch(/grant execute on function public\.set_follow_state/)
  })

  it("clamps caller-supplied RPC limits so direct API calls cannot bypass the cap", () => {
    expect(migration).toMatch(/if p_limit is null or p_limit < 1 then p_limit := 60; end if;/)
    expect(migration).toMatch(/if p_limit > 60 then p_limit := 60; end if;/)
    expect(migration).toMatch(/if p_limit is null or p_limit < 1 then p_limit := 40; end if;/)
    expect(migration).toMatch(/if p_limit > 40 then p_limit := 40; end if;/)
  })
})
