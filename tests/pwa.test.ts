import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  PWA_DISMISS_KEY,
  isIosSafari,
  isStandaloneDisplay,
  readInstallDismissed,
} from "@/lib/pwa"

const root = path.join(__dirname, "..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("PWA infrastructure", () => {
  it("ships a web app manifest with required install fields", () => {
    const manifest = read("app/manifest.ts")
    expect(manifest).toMatch(/short_name:\s*SITE_NAME/)
    expect(manifest).toMatch(/display:\s*"standalone"/)
    expect(manifest).toMatch(/start_url/)
    expect(manifest).toMatch(/icon-192\.png/)
    expect(manifest).toMatch(/icon-512\.png/)
    expect(manifest).toMatch(/icon-maskable-512\.png/)
    expect(manifest).toMatch(/theme_color:\s*"#ffffff"/)
    expect(manifest).toMatch(/background_color:\s*"#ffffff"/)
  })

  it("provides brand icons for install surfaces", () => {
    expect(existsSync(path.join(root, "public/icons/icon-192.png"))).toBe(true)
    expect(existsSync(path.join(root, "public/icons/icon-512.png"))).toBe(true)
    expect(existsSync(path.join(root, "public/icons/icon-maskable-512.png"))).toBe(true)
    expect(existsSync(path.join(root, "public/icons/apple-touch-icon.png"))).toBe(true)
  })

  it("uses a conservative service worker that skips auth and editor corruption risks", () => {
    const sw = read("public/sw.js")
    expect(sw).toMatch(/pxlb-pwa-v1/)
    expect(sw).toMatch(/offline\.html/)
    expect(sw).toMatch(/\/_next\/static\//)
    expect(sw).toMatch(/pixel-cover/)
    expect(sw).toMatch(/\/auth\//)
    expect(sw).toMatch(/isEditorPath/)
    expect(sw).toMatch(/skipWaiting/)
    expect(existsSync(path.join(root, "public/offline.html"))).toBe(true)
  })

  it("registers the SW and exposes install UX without duplicating PWA libraries", () => {
    const pkg = read("package.json")
    expect(pkg).not.toMatch(/next-pwa|@ducanh2912\/next-pwa|serwist|workbox-webpack/)
    expect(read("components/pwa/PwaRegister.tsx")).toMatch(/serviceWorker\.register\("\/sw\.js"/)
    expect(read("components/pwa/PwaInstall.tsx")).toMatch(/beforeinstallprompt/)
    expect(read("components/pwa/PwaInstall.tsx")).toMatch(/AbortError|userChoice|accepted/)
    expect(read("components/layout/PublicShell.tsx")).toMatch(/PwaRegister/)
    expect(read("components/layout/PublicShell.tsx")).toMatch(/PwaInstall/)
    expect(read("components/profiles/SettingsForm.tsx")).toMatch(/PwaInstall/)
  })

  it("keeps sw.js out of middleware and sets no-cache headers", () => {
    // Source stores an escaped regex literal: sw\.js → "sw\\.js" on disk.
    expect(read("middleware.ts")).toContain("sw\\\\.js")
    expect(read("next.config.ts")).toContain('source: "/sw.js"')
    expect(read("next.config.ts")).toContain("Service-Worker-Allowed")
  })
})


describe("pwa helpers", () => {
  it("defaults dismiss/standalone safely on the server", () => {
    expect(isStandaloneDisplay()).toBe(false)
    expect(isIosSafari()).toBe(false)
    expect(readInstallDismissed()).toBe(true)
    expect(PWA_DISMISS_KEY).toMatch(/pxlb\.pwa/)
  })
})
