/** Pixel avatar config — stored on profiles.avatar_config, rendered as SVG. */

export type AvatarConfig = {
  v: 1
  bg: number
  skin: number
  hair: number
  hairColor: number
  eyes: number
  mouth: number
  shirt: number
}

export const AVATAR_PALETTE = [
  "#fffdf7",
  "#59bceb",
  "#45a849",
  "#ffd447",
  "#e94b3c",
  "#936037",
  "#282b35",
  "#f4f1e8",
] as const

export const AVATAR_SKIN = ["#f2c9a0", "#e0a878", "#c68642", "#8d5524"] as const
export const AVATAR_HAIR = ["#282b35", "#936037", "#e94b3c", "#ffd447", "#59bceb"] as const
export const AVATAR_SHIRT = ["#59bceb", "#45a849", "#e94b3c", "#ffd447", "#936037", "#282b35"] as const

export function isAvatarConfig(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    v.v === 1 &&
    typeof v.bg === "number" &&
    typeof v.skin === "number" &&
    typeof v.hair === "number" &&
    typeof v.hairColor === "number" &&
    typeof v.eyes === "number" &&
    typeof v.mouth === "number" &&
    typeof v.shirt === "number"
  )
}

export function parseAvatarConfig(value: unknown): AvatarConfig | null {
  return isAvatarConfig(value) ? value : null
}

/** Stable 32-bit hash for deterministic defaults. */
export function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick(seed: number, salt: number, modulo: number) {
  return (seed + salt * 2654435761) % modulo
}

export function avatarFromSeed(seedInput: string | number): AvatarConfig {
  const seed = typeof seedInput === "number" ? seedInput >>> 0 : hashSeed(seedInput)
  return {
    v: 1,
    bg: pick(seed, 1, AVATAR_PALETTE.length),
    skin: pick(seed, 2, AVATAR_SKIN.length),
    hair: pick(seed, 3, 4),
    hairColor: pick(seed, 4, AVATAR_HAIR.length),
    eyes: pick(seed, 5, 3),
    mouth: pick(seed, 6, 3),
    shirt: pick(seed, 7, AVATAR_SHIRT.length),
  }
}

export function generateAvatarCandidates(userId: string, round: number, count = 8): AvatarConfig[] {
  const base = hashSeed(`${userId}:avatar:${round}`)
  const out: AvatarConfig[] = []
  for (let i = 0; i < count; i++) {
    out.push(avatarFromSeed((base + i * 9973) >>> 0))
  }
  return out
}

export function defaultAvatarConfig(userId: string): AvatarConfig {
  return avatarFromSeed(userId)
}
