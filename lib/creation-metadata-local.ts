/** Browser-local Studio draft — not the source of truth after a successful save. */

import { parsePixelSource, type PixelSource } from "@/lib/pixel"

export type LocalCreationMetadata = {
  title: string
  caption: string
  tags: string[]
  updatedAt: number
}

/** Prefer localStorage under this size; larger (or quota failure) → IndexedDB. */
export const LOCAL_SOURCE_LS_SOFT_MAX = 120_000

const IDB_NAME = "commons-pixel-drafts"
const IDB_VERSION = 1
const IDB_STORE = "sources"

function metaKey(creationId: string) {
  return `commons:creation-meta:${creationId}`
}

function sourceKey(creationId: string) {
  return `commons:creation-source:${creationId}`
}

function openDraftDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("idb"))
      return
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("idb"))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

async function idbGetSource(creationId: string): Promise<unknown | null> {
  const db = await openDraftDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly")
      const req = tx.objectStore(IDB_STORE).get(creationId)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error ?? new Error("idb-get"))
    })
  } finally {
    db.close()
  }
}

async function idbPutSource(creationId: string, source: PixelSource): Promise<void> {
  const db = await openDraftDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("idb-put"))
      tx.objectStore(IDB_STORE).put(source, creationId)
    })
  } finally {
    db.close()
  }
}

async function idbDeleteSource(creationId: string): Promise<void> {
  const db = await openDraftDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite")
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error("idb-del"))
      tx.objectStore(IDB_STORE).delete(creationId)
    })
  } finally {
    db.close()
  }
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

function parseStoredSource(raw: unknown): PixelSource | null {
  const parsed = parsePixelSource(raw)
  return parsed.ok ? parsed.data : null
}

export async function readLocalCreationSource(
  creationId: string,
): Promise<PixelSource | null> {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(sourceKey(creationId))
    if (raw) {
      const fromLs = parseStoredSource(JSON.parse(raw))
      if (fromLs) return fromLs
    }
  } catch {
    /* fall through to IndexedDB */
  }
  try {
    const fromIdb = await idbGetSource(creationId)
    if (fromIdb == null) return null
    return parseStoredSource(fromIdb)
  } catch {
    return null
  }
}

/**
 * Persist pixel source locally. Small payloads use localStorage; large ones (or
 * quota failures) use IndexedDB. Returns false if both backends fail.
 */
export async function writeLocalCreationSource(
  creationId: string,
  source: PixelSource,
): Promise<boolean> {
  if (typeof window === "undefined") return false
  const raw = JSON.stringify(source)

  if (raw.length <= LOCAL_SOURCE_LS_SOFT_MAX) {
    try {
      window.localStorage.setItem(sourceKey(creationId), raw)
      try {
        await idbDeleteSource(creationId)
      } catch {
        /* optional cleanup */
      }
      return true
    } catch {
      /* quota — try IndexedDB */
    }
  } else {
    try {
      window.localStorage.removeItem(sourceKey(creationId))
    } catch {
      /* ignore */
    }
  }

  try {
    await idbPutSource(creationId, source)
    return true
  } catch {
    return false
  }
}

export async function clearLocalCreationSource(creationId: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(sourceKey(creationId))
  } catch {
    /* ignore */
  }
  try {
    await idbDeleteSource(creationId)
  } catch {
    /* ignore */
  }
}

export async function clearLocalCreationDraft(creationId: string) {
  clearLocalCreationMetadata(creationId)
  await clearLocalCreationSource(creationId)
}
