/** Browser-local Studio draft — not the source of truth after a successful save. */

import { parsePixelSource, type PixelSourceV1 } from "@/lib/pixel"

export type LocalCreationMetadata = {
  title: string
  caption: string
  tags: string[]
  updatedAt: number
}

function metaKey(creationId: string) {
  return `commons:creation-meta:${creationId}`
}

function sourceKey(creationId: string) {
  return `commons:creation-source:${creationId}`
}

export function readLocalCreationMetadata(creationId: string): LocalCreationMetadata | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(metaKey(creationId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalCreationMetadata>
    if (typeof parsed.title !== "string" || typeof parsed.caption !== "string") return null
    if (!Array.isArray(parsed.tags) || !parsed.tags.every((item) => typeof item === "string")) {
      return null
    }
    return {
      title: parsed.title,
      caption: parsed.caption,
      tags: parsed.tags,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return null
  }
}

export function writeLocalCreationMetadata(
  creationId: string,
  value: Omit<LocalCreationMetadata, "updatedAt">,
) {
  if (typeof window === "undefined") return
  try {
    const payload: LocalCreationMetadata = { ...value, updatedAt: Date.now() }
    window.localStorage.setItem(metaKey(creationId), JSON.stringify(payload))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearLocalCreationMetadata(creationId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(metaKey(creationId))
  } catch {
    /* ignore */
  }
}

export function readLocalCreationSource(creationId: string): PixelSourceV1 | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(sourceKey(creationId))
    if (!raw) return null
    const parsed = parsePixelSource(JSON.parse(raw))
    return parsed.ok ? parsed.data : null
  } catch {
    return null
  }
}

export function writeLocalCreationSource(creationId: string, source: PixelSourceV1) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(sourceKey(creationId), JSON.stringify(source))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearLocalCreationSource(creationId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(sourceKey(creationId))
  } catch {
    /* ignore */
  }
}

export function clearLocalCreationDraft(creationId: string) {
  clearLocalCreationMetadata(creationId)
  clearLocalCreationSource(creationId)
}
