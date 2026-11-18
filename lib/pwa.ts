/** Client-side PWA helpers (install + standalone detection). */

export const PWA_DISMISS_KEY = "pxlb.pwa.installDismissed"
export const PWA_DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 21 // 21 days soft dismiss

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false
  const media = window.matchMedia("(display-mode: standalone)").matches
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return media || iosStandalone
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  const webkit = /WebKit/.test(ua)
  const notOther = !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua)
  return iOS && webkit && notOther
}

export function readInstallDismissed(now = Date.now()): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = window.localStorage.getItem(PWA_DISMISS_KEY)
    if (!raw) return false
    if (raw === "forever") return true
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return now - ts < PWA_DISMISS_TTL_MS
  } catch {
    return false
  }
}

export function writeInstallDismissed(forever = false) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PWA_DISMISS_KEY, forever ? "forever" : String(Date.now()))
  } catch {
    // ignore quota / private mode
  }
}

export function clearInstallDismissed() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(PWA_DISMISS_KEY)
  } catch {
    // ignore
  }
}
