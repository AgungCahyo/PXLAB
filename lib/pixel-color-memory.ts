"use client"

import { useCallback, useSyncExternalStore } from "react"
import { PIXEL_FAVORITE_MAX, PIXEL_RECENT_MAX, normalizePixelHex } from "@/lib/pixel"

const RECENT_KEY = "the-commons.pixel.recent-colors"
const FAVORITE_KEY = "the-commons.pixel.favorite-colors"
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener)
    }
  }
}

function readList(key: string, max: number) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return [] as string[]
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return [] as string[]
    const out: string[] = []
    for (const item of parsed) {
      if (typeof item !== "string") continue
      const hex = normalizePixelHex(item)
      if (!hex || out.includes(hex)) continue
      out.push(hex)
      if (out.length >= max) break
    }
    return out
  } catch {
    return [] as string[]
  }
}

function writeList(key: string, value: string[]) {
  window.localStorage.setItem(key, JSON.stringify(value))
  emit()
}

function snapshot(key: string, max: number) {
  if (typeof window === "undefined") return "[]"
  return JSON.stringify(readList(key, max))
}

export function usePixelColorMemory() {
  const recentJson = useSyncExternalStore(
    subscribe,
    () => snapshot(RECENT_KEY, PIXEL_RECENT_MAX),
    () => "[]",
  )
  const favoriteJson = useSyncExternalStore(
    subscribe,
    () => snapshot(FAVORITE_KEY, PIXEL_FAVORITE_MAX),
    () => "[]",
  )
  const recent = JSON.parse(recentJson) as string[]
  const favorites = JSON.parse(favoriteJson) as string[]

  const remember = useCallback((hex: string) => {
    const normalized = normalizePixelHex(hex)
    if (!normalized) return
    const prev = readList(RECENT_KEY, PIXEL_RECENT_MAX)
    writeList(RECENT_KEY, [normalized, ...prev.filter((item) => item !== normalized)].slice(0, PIXEL_RECENT_MAX))
  }, [])

  const toggleFavorite = useCallback((hex: string) => {
    const normalized = normalizePixelHex(hex)
    if (!normalized) return
    const prev = readList(FAVORITE_KEY, PIXEL_FAVORITE_MAX)
    const next = prev.includes(normalized)
      ? prev.filter((item) => item !== normalized)
      : [normalized, ...prev].slice(0, PIXEL_FAVORITE_MAX)
    writeList(FAVORITE_KEY, next)
  }, [])

  return { recent, favorites, remember, toggleFavorite }
}
