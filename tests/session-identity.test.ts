import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const session = readFileSync(
  path.resolve(__dirname, "..", "lib/auth/session.ts"),
  "utf8",
)

describe("request-scoped identity dedupe (Section N step 4)", () => {
  it("uses React cache() so identity reads are scoped to one render pass", () => {
    expect(session).toMatch(/import \{ cache \} from "react"/)
    expect(session).toMatch(/export const getCurrentAuthUser = cache\(async/)
  })

  it("performs exactly one auth.getUser() in the cached primitive", () => {
    expect(session.match(/auth\.getUser\(\)/g)).toHaveLength(1)
  })

  it("derives the user id and profile from the shared primitive", () => {
    const userId = session.match(/export const getSessionUserId = cache\(async \(\) => \{[\s\S]*?\n\}\)/)?.[0]
    const profile = session.match(/export const getCurrentProfile = cache\(async \(\)[\s\S]*?\n\}\)/)?.[0]
    expect(userId, "getSessionUserId body").toBeDefined()
    expect(profile, "getCurrentProfile body").toBeDefined()
    expect(userId).toMatch(/await getCurrentAuthUser\(\)/)
    expect(profile).toMatch(/await getCurrentAuthUser\(\)/)
    expect(userId).not.toMatch(/auth\.getUser/)
    expect(profile).not.toMatch(/auth\.getUser/)
  })

  it("keeps public-profile reads independent of the session cache", () => {
    // getProfileByUsername uses the public (cookie-less) client, so it must not
    // be folded into the request-scoped identity primitive.
    expect(session).toMatch(/export async function getProfileByUsername/)
    expect(session).toMatch(/createPublicSupabase\(\)/)
  })
})
