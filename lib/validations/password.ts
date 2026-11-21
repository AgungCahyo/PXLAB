export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

/** Small local denylist — Supabase should also enforce its own password policy. */
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "qwertyui",
  "qwerty123",
  "qwerty12",
  "asdfghjk",
  "zxcvbnm1",
  "abcdefgh",
  "abc12345",
  "iloveyou",
  "letmein",
  "welcome1",
  "admin123",
  "pxlb1234",
  "pxlb",
  "commons",
  "simple123",
])

const SEQUENCES = [
  /^0123456789/,
  /^abcdefghijklmnopqrstuvwxyz/,
  /^qwertyuiop/,
  /^asdfghjkl/,
  /^zxcvbnm/,
]

function hasSequentialRun(value: string): boolean {
  const chars = value.toLowerCase()
  for (let i = 0; i + 3 < chars.length; i++) {
    const a = chars.charCodeAt(i)
    const b = chars.charCodeAt(i + 1)
    const c = chars.charCodeAt(i + 2)
    const d = chars.charCodeAt(i + 3)
    if ((b === a + 1 && c === b + 1 && d === c + 1) || (b === a - 1 && c === b - 1 && d === c - 1)) {
      return true
    }
  }
  return false
}

/**
 * Deterministic, dependency-free strength check for server-side validation.
 * 8–71 chars need 3 of 4 character types; 14+ chars need only 2.
 */
export function isStrongPassword(value: string): boolean {
  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) return false

  const normalized = value.toLowerCase()
  if (COMMON_PASSWORDS.has(normalized)) return false
  if (/(.)\1{3,}/.test(value)) return false
  if (SEQUENCES.some((pattern) => pattern.test(normalized))) return false
  if (hasSequentialRun(normalized)) return false

  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].reduce(
    (count, pattern) => count + (pattern.test(value) ? 1 : 0),
    0,
  )
  return kinds >= (value.length >= 14 ? 2 : 3)
}
