import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { authDestination, loginHref, safeInternalPath } from "@/lib/paths"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("safe return after sign-in", () => {
  it("only accepts same-origin paths", () => {
    expect(safeInternalPath("/creation/abc")).toBe("/creation/abc")
    expect(safeInternalPath("//evil.test")).toBe("/")
    expect(safeInternalPath("https://evil.test")).toBe("/")
    expect(safeInternalPath("../escape")).toBe("/")
    expect(authDestination("id", "/")).toBe("/explore")
    expect(authDestination("en", "/en/creation/1")).toBe("/en/creation/1")
    expect(loginHref("id", "/creation/1")).toContain("next=")
  })

  it("threads next through auth forms and member gate", () => {
    const login = read("app/[lang]/(auth)/login/page.tsx")
    const form = read("components/auth/LoginForm.tsx")
    const actions = read("features/auth/actions.ts")
    const member = read("app/[lang]/(member)/layout.tsx")
    const community = read("components/community/CreationCommunity.tsx")
    const callback = read("app/auth/callback/route.ts")

    expect(login).toMatch(/searchParams/)
    expect(form).toMatch(/name="next"/)
    expect(actions).toMatch(/authDestination/)
    expect(member).toMatch(/loginHref/)
    expect(member).toMatch(/x-pathname/)
    expect(community).toMatch(/loginHref/)
    expect(callback).toMatch(/safeInternalPath/)
  })
})

describe("navigation icons", () => {
  it("keeps tab labels and adds pixel icons", () => {
    const nav = read("components/layout/SiteNav.tsx")
    const icons = read("components/ui/PixelIcon.tsx")
    expect(nav).toMatch(/PixelIcon/)
    expect(nav).toMatch(/icon: "grid"/)
    expect(nav).toMatch(/icon: "pencil"/)
    expect(nav).toMatch(/icon: "user"/)
    expect(nav).toMatch(/nav\.explore/)
    expect(icons).toMatch(/user:/)
    expect(icons).toMatch(/folder:/)
  })
})
