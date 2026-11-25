import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { langFromAcceptLanguage } from "@/lib/i18n"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

/** Source-level contract for UI standardisation phase 1 (docs/audit/UI_INTERACTION_SPEC.md). */
describe("UI standardisation P0 contract", () => {
  it("drives the sidebar responses badge from real state, not a hard-coded count", () => {
    const nav = read("components/layout/SocialNav.tsx")
    expect(nav).not.toMatch(/count = 3/)
    expect(nav).not.toMatch(/count=\{3\}/)
    expect(nav).not.toMatch(/3 respon baru/)
    expect(nav).toMatch(/Boolean\(member\?\.hasResponses\)/)
    expect(nav).toMatch(/notificationsUnread/)
  })

  it("keeps a single mobile tab bar after removing the dead AppTabBar", () => {
    expect(read("components/layout/SiteNav.tsx")).not.toMatch(/AppTabBar/)
    const socialNav = read("components/layout/SocialNav.tsx")
    expect(socialNav).toMatch(/SocialTabBar/)
    expect(socialNav).toMatch(/app-tabbar/)
  })

  it("gives the shared Button a loading contract", () => {
    const button = read("components/ui/Button.tsx")
    expect(button).toMatch(/loading = false/)
    expect(button).toMatch(/aria-busy/)
    expect(button).toMatch(/disabled=\{loading \|\| disabled\}/)
    expect(button).toMatch(/data-loading/)
  })

  it("leaves no dead appearance prop on shared fields or their call sites", () => {
    expect(read("components/ui/Input.tsx")).not.toMatch(/appearance/)
    expect(read("components/ui/Textarea.tsx")).not.toMatch(/appearance/)
    const offenders = sourceFiles(path.resolve(__dirname, "..", "components")).filter((file) =>
      readFileSync(file, "utf8").includes("appearance="),
    )
    expect(offenders).toEqual([])
  })

  it("returns focus and locks body scroll in the shared Dialog", () => {
    const dialog = read("components/ui/Dialog.tsx")
    expect(dialog).toMatch(/aria-labelledby=\{titleId\}/)
    expect(dialog).toMatch(/restoreFocusRef/)
    expect(dialog).toMatch(/lockBodyScroll/)
    expect(dialog).toMatch(/addEventListener\("close"/)
  })

  it("marks the instant-interaction audit as outdated history", () => {
    expect(read("docs/INSTANT-INTERACTION-AUDIT.md")).toMatch(/OUTDATED/)
  })
})

/** Source-level contract for UI standardisation phase 2 (UI_INTERACTION_SPEC.md §4.3, §4.6, §4.9). */
describe("UI standardisation phase 2 contract", () => {
  it("uses full menu semantics through a shared keyboard contract", () => {
    const helper = read("components/ui/menuKeyboard.ts")
    expect(helper).toMatch(/export function handleMenuKeyDown/)
    expect(helper).toMatch(/ArrowDown/)
    expect(helper).toMatch(/ArrowUp/)
    expect(helper).toMatch(/Escape/)
    expect(helper).toMatch(/Tab/)
    expect(helper).toMatch(/role="menuitem"/)

    const nav = read("components/layout/SiteNav.tsx")
    expect(nav).toMatch(/aria-haspopup="menu"/)
    expect(nav).toMatch(/role="menu"/)
    expect(nav).toMatch(/aria-labelledby=\{triggerId\}/)
    expect(nav).toMatch(/role="menuitem"/)
    expect(nav).toMatch(/tabIndex=\{-1\}/)
    expect(nav).toMatch(/handleMenuKeyDown/)
    expect(nav).toMatch(/triggerRef\.current\?\.focus\(\)/)

    const row = read("components/creations/WorksRow.tsx")
    expect(row).toMatch(/aria-haspopup="menu"/)
    expect(row).toMatch(/role="menu"/)
    expect(row).toMatch(/handleMenuKeyDown/)
    expect(row).toMatch(/copy\.moreActions\[lang\]/)
    expect(read("components/creations/WorksDeleteButton.tsx")).toMatch(
      /variant === "menuitem" \? "menuitem" : undefined/,
    )
  })

  it("gives toasts a localized manual dismiss that clears the timer", () => {
    const toast = read("components/social/Toast.tsx")
    expect(toast).toMatch(/const dismiss = useCallback/)
    expect(toast).toMatch(/copy\.toastDismiss\[lang\]/)
    expect(toast).toMatch(/window\.clearTimeout\(timer\)/)
    expect(toast).toMatch(/role="status"/)
    expect(toast).toMatch(/aria-live="polite"/)
    expect(read("components/layout/PublicShell.tsx")).toMatch(/<ToastProvider lang=\{lang\}>/)
  })

  it("localizes the offline shell and drives it from shipped tokens", () => {
    const offline = read("public/offline.html")
    expect(offline).toMatch(/navigator\.language/)
    expect(offline).toMatch(/document\.documentElement\.lang = "en"/)
    expect(offline).toMatch(/id="offline-title"/)
    expect(offline).toMatch(/id="offline-body"/)
    expect(offline).toMatch(/--bg: #f8f9fc/)
    expect(offline).toMatch(/--fg: #1e1b4b/)
    expect(offline).toMatch(/background: var\(--bg\)/)
    expect(offline).toMatch(/color: var\(--fg\)/)
    expect(offline).not.toMatch(/background: #|color: #|border: 3px solid #/)
  })

  it("localizes the root not-found from Accept-Language", () => {
    const notFound = read("app/not-found.tsx")
    expect(notFound).toMatch(/export default async function RootNotFound/)
    expect(notFound).toMatch(/headers\(\)/)
    expect(notFound).toMatch(/langFromAcceptLanguage/)
    expect(notFound).toMatch(/<html lang=\{lang\}/)
    // Cache Components: request-time headers() must opt out of prerendering or `next build` fails.
    expect(notFound).toMatch(/export const instant = false/)
    expect(read("lib/i18n.ts")).toMatch(/export function langFromAcceptLanguage/)
  })

  it("honors q-values and primary subtags for Accept-Language", () => {
    expect(langFromAcceptLanguage(null)).toBe("id")
    expect(langFromAcceptLanguage("en-US,en;q=0.9")).toBe("en")
    expect(langFromAcceptLanguage("id-ID, id;q=0.9")).toBe("id")
    expect(langFromAcceptLanguage("fr-FR;q=0.8, en-GB;q=0.9")).toBe("en")
    expect(langFromAcceptLanguage("fr-FR")).toBe("id")
  })

  it("records the U3 authority, U5/U7 contracts, freezes and phase log", () => {
    const spec = read("docs/audit/UI_INTERACTION_SPEC.md")
    expect(spec).toMatch(/live CSS tokens win/)
    expect(spec).toMatch(/### 4\.6\.1 U5/)
    expect(spec).toMatch(/### 4\.6\.2 U7/)
    expect(spec).toMatch(/### 4\.9 Scope freezes/)
    expect(spec).toMatch(/Legacy creation path — FROZEN/)
    expect(spec).toMatch(/Icon set — FROZEN/)
    expect(spec).toMatch(/Execution log — Phase 2/)
    const design = read("docs/PIXEL-ART-DESIGN-SYSTEM.md")
    expect(design).toMatch(/Reconciliation \(U3/)
    expect(design).toMatch(/#F43F5E/)
    expect(design).toMatch(/#1E1B4B/)
  })
})
