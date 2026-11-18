import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { pixelWorldSceneFromPath } from "@/components/layout/PixelWorldBackdrop"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("Pixel World backdrop", () => {
  const shell = read("components/layout/PublicShell.tsx")
  const world = read("components/layout/PixelWorldBackdrop.tsx")
  const css = read("app/globals.css")

  it("mounts behind PublicShell content", () => {
    expect(shell).toMatch(/PixelWorldBackdrop/)
    expect(shell).toMatch(/relative z-10/)
    expect(world).toMatch(/data-pixel-world/)
    expect(world).toMatch(/aria-hidden/)
  })

  it("maps routes to distinct scenes and keeps playground empty", () => {
    expect(pixelWorldSceneFromPath("/")).toBe("home")
    expect(pixelWorldSceneFromPath("/en")).toBe("home")
    expect(pixelWorldSceneFromPath("/explore")).toBe("explore")
    expect(pixelWorldSceneFromPath("/en/explore")).toBe("explore")
    expect(pixelWorldSceneFromPath("/create")).toBe("create")
    expect(pixelWorldSceneFromPath("/create/abc")).toBe("playground")
    expect(pixelWorldSceneFromPath("/en/create/abc")).toBe("playground")
    expect(pixelWorldSceneFromPath("/creation/abc")).toBe("detail")
    expect(pixelWorldSceneFromPath("/u/maple")).toBe("profile")
    expect(pixelWorldSceneFromPath("/dashboard")).toBe("works")
    expect(pixelWorldSceneFromPath("/login")).toBe("auth")
    expect(pixelWorldSceneFromPath("/space")).toBe("space")
    expect(pixelWorldSceneFromPath("/settings")).toBe("settings")
    expect(pixelWorldSceneFromPath("/admin")).toBe("admin")
    expect(world).toMatch(/scene === "playground"/)
  })

  it("uses soft Paper atmosphere CSS and hides on playground chrome", () => {
    expect(css).toMatch(/\.pixel-world/)
    expect(css).toMatch(/pixel-world-sky/)
    expect(css).toMatch(/pixel-world-ground/)
    expect(css).toMatch(/pixel-world-veil/)
    expect(css).toMatch(/color-mix\(in srgb, var\(--sky\)/)
    expect(css).toMatch(/color-mix\(in srgb, var\(--grass\)/)
    expect(css).not.toMatch(/#5c94fc/)
    expect(css).not.toMatch(/#c84c0c/)
    expect(css).toMatch(/pixel-world-drift/)
    expect(css).toMatch(/pixel-world-bob/)
    expect(css).toMatch(/data-chrome="playground"\]\) \.pixel-world/)
    expect(css).toMatch(/data-chrome="studio"\]\) \.pixel-world/)
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*pixel-world-bob/)
  })
})
