import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"
import { isLang, type Lang } from "@/lib/i18n"
import { safeInternalPath } from "@/lib/paths"

/**
 * Password recovery is the only flow allowed to mint a short-lived capability.
 * The signed `state` travels in the emailed link; the encrypted `ticket` is set
 * by the recovery callback and is the sole authorization for a password change.
 * Supabase's recovery session is discarded before the redirect, so following a
 * reset link never leaves a normal authenticated session behind.
 */

export const RECOVERY_COOKIE = "pxlb_recovery"
export const RECOVERY_STATE_PARAM = "state"
export const RECOVERY_STATE_TTL_MS = 60 * 60 * 1000
export const RECOVERY_TICKET_TTL_SECONDS = 15 * 60
export const UPDATE_PASSWORD_PER_TICKET = 5

const VERSION = "v1"
const DEVICE_SECRET = "pxlb-local-recovery-secret-change-me"

/** Missing secret fails closed in production; local/test use a documented fallback. */
export function getRecoverySecret(): string | null {
  const configured = process.env.AUTH_RECOVERY_SECRET?.trim()
  if (configured && configured.length >= 16) return configured
  if (process.env.NODE_ENV === "production") return null
  return configured || DEVICE_SECRET
}

export type RecoveryState = {
  nonce: string
  exp: number
  lang: Lang
  next: string
}

export type RecoveryTicket = {
  nonce: string
  sub: string
  exp: number
  accessToken: string
  refreshToken: string
}

function sign(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function ticketKey(secret: string) {
  return createHash("sha256").update(`pxlb-recovery-ticket:${secret}`).digest()
}

/** Capability embedded in the emailed link. `next` is pinned so it cannot be swapped later. */
export function createRecoveryState(
  input: { lang: Lang; next: unknown },
  now = Date.now(),
): string | null {
  const secret = getRecoverySecret()
  if (!secret) return null

  const state: RecoveryState = {
    nonce: randomBytes(16).toString("base64url"),
    exp: now + RECOVERY_STATE_TTL_MS,
    lang: input.lang,
    next: safeInternalPath(input.next, "/"),
  }
  const body = Buffer.from(JSON.stringify(state)).toString("base64url")
  const payload = `${VERSION}.${body}`
  return `${payload}.${sign(payload, secret)}`
}

export function verifyRecoveryState(token: unknown, now = Date.now()): RecoveryState | null {
  const secret = getRecoverySecret()
  if (!secret || typeof token !== "string") return null
  const [version, body, signature] = token.split(".")
  if (!version || !body || !signature || version !== VERSION) return null
  const payload = `${version}.${body}`
  if (!safeEqual(signature, sign(payload, secret))) return null

  try {
    const value: unknown = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
    if (
      !isObject(value) ||
      typeof value.nonce !== "string" ||
      typeof value.exp !== "number" ||
      typeof value.next !== "string" ||
      typeof value.lang !== "string" ||
      !isLang(value.lang) ||
      value.exp <= now
    ) {
      return null
    }
    return {
      nonce: value.nonce,
      exp: value.exp,
      lang: value.lang,
      next: safeInternalPath(value.next, "/"),
    }
  } catch {
    return null
  }
}

/** Short-lived, encrypted capability issued only after a valid recovery callback. */
export function createRecoveryTicket(
  input: {
    state: RecoveryState
    userId: string
    accessToken: string
    refreshToken: string
  },
  now = Date.now(),
): string | null {
  const secret = getRecoverySecret()
  if (!secret) return null

  const payload: RecoveryTicket = {
    nonce: input.state.nonce,
    sub: input.userId,
    exp: now + RECOVERY_TICKET_TTL_SECONDS * 1000,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  }
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", ticketKey(secret), iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ])
  return [
    VERSION,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
  ].join(".")
}

export function verifyRecoveryTicket(token: unknown, now = Date.now()): RecoveryTicket | null {
  const secret = getRecoverySecret()
  if (!secret || typeof token !== "string") return null
  const [version, ivPart, dataPart, tagPart] = token.split(".")
  if (!version || !ivPart || !dataPart || !tagPart || version !== VERSION) return null

  try {
    const decipher = createDecipheriv("aes-256-gcm", ticketKey(secret), Buffer.from(ivPart, "base64url"))
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"))
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8")
    const value: unknown = JSON.parse(plain)
    if (
      !isObject(value) ||
      typeof value.nonce !== "string" ||
      typeof value.sub !== "string" ||
      typeof value.exp !== "number" ||
      typeof value.accessToken !== "string" ||
      typeof value.refreshToken !== "string" ||
      value.exp <= now
    ) {
      return null
    }
    return {
      nonce: value.nonce,
      sub: value.sub,
      exp: value.exp,
      accessToken: value.accessToken,
      refreshToken: value.refreshToken,
    }
  } catch {
    return null
  }
}

/** One-way use of a recovery link: a nonce cannot mint a second ticket. */
const usedNonces = new Map<string, number>()

export function markRecoveryNonceUsed(nonce: string, now = Date.now()): boolean {
  const until = usedNonces.get(nonce)
  if (until && until > now) return false
  for (const [key, expiry] of usedNonces) {
    if (expiry <= now) usedNonces.delete(key)
  }
  usedNonces.set(nonce, now + RECOVERY_STATE_TTL_MS)
  return true
}

export function recoveryCookieOptions(maxAge = RECOVERY_TICKET_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  }
}
