import { beforeEach, describe, expect, it } from "vitest"
import {
  RECOVERY_STATE_TTL_MS,
  createRecoveryState,
  createRecoveryTicket,
  markRecoveryNonceUsed,
  recoveryCookieOptions,
  verifyRecoveryState,
  verifyRecoveryTicket,
} from "@/lib/auth/recovery"

beforeEach(() => {
  process.env.AUTH_RECOVERY_SECRET = "test-secret-with-at-least-16-chars"
})

describe("recovery state", () => {
  it("round-trips the pinned destination and language", () => {
    const token = createRecoveryState({ lang: "en", next: "/explore?tab=new" })
    expect(token).not.toBeNull()
    const state = verifyRecoveryState(token)
    expect(state).toMatchObject({ lang: "en", next: "/explore?tab=new" })
    expect(state?.nonce).toBeTruthy()
  })

  it("rejects off-site destinations and tampering", () => {
    const token = createRecoveryState({ lang: "id", next: "https://evil.example" })
    expect(verifyRecoveryState(token)?.next).toBe("/")
    const parts = token!.split(".")
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`
    expect(verifyRecoveryState(parts.join("."))).toBeNull()
    expect(verifyRecoveryState("v1.bogus.signature")).toBeNull()
    expect(verifyRecoveryState(null)).toBeNull()
  })

  it("expires", () => {
    const now = Date.now()
    const token = createRecoveryState({ lang: "id", next: "/" }, now - RECOVERY_STATE_TTL_MS - 1)
    expect(verifyRecoveryState(token, now)).toBeNull()
  })
})

describe("recovery ticket", () => {
  it("encrypts the temporary session and only decrypts with a valid nonce", () => {
    const state = verifyRecoveryState(createRecoveryState({ lang: "id", next: "/" }))
    expect(state).not.toBeNull()
    const ticket = createRecoveryTicket({
      state: state!,
      userId: "user-1",
      accessToken: "secret-access-token",
      refreshToken: "secret-refresh-token",
    })
    expect(ticket).not.toContain("secret-access-token")
    expect(verifyRecoveryTicket(ticket)).toMatchObject({
      nonce: state!.nonce,
      sub: "user-1",
      accessToken: "secret-access-token",
      refreshToken: "secret-refresh-token",
    })
    const parts = ticket!.split(".")
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`
    expect(verifyRecoveryTicket(parts.join("."))).toBeNull()
  })

  it("expires and uses secure browser settings", () => {
    const state = verifyRecoveryState(createRecoveryState({ lang: "id", next: "/" }))!
    const now = Date.now()
    const ticket = createRecoveryTicket(
      {
        state,
        userId: "user-1",
        accessToken: "a",
        refreshToken: "r",
      },
      now - 16 * 60 * 1000,
    )
    expect(verifyRecoveryTicket(ticket, now)).toBeNull()
    expect(recoveryCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    })
  })
})

describe("one-time recovery links", () => {
  it("allows one ticket per link", () => {
    const token = createRecoveryState({ lang: "id", next: "/" })!
    const nonce = verifyRecoveryState(token)!.nonce
    expect(markRecoveryNonceUsed(nonce)).toBe(true)
    expect(markRecoveryNonceUsed(nonce)).toBe(false)
    expect(markRecoveryNonceUsed("another-nonce")).toBe(true)
  })
})
