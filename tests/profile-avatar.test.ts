import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { fitAvatarSize, prepareAvatarFile } from "@/lib/avatar-image"
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_MAX_EDGE,
  avatarObjectPath,
  isAvatarMimeType,
} from "@/lib/site"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("profile avatar", () => {
  const avatar = read("components/profiles/ProfileAvatar.tsx")
  const settings = read("components/profiles/SettingsForm.tsx")
  const actions = read("features/profiles/actions.ts")
  const compress = read("lib/avatar-image.ts")

  it("ships a custom pixel fallback mark distinct from the nav user icon", () => {
    expect(avatar).toMatch(/ProfileAvatarMark/)
    expect(avatar).toMatch(/viewBox="0 0 32 32"/)
    expect(avatar).toMatch(/fill-sky/)
    expect(avatar).toMatch(/fill-brick/)
  })

  it("renders a photo when src is set and the mark when it is not, including xs", () => {
    expect(avatar).toMatch(/src \? \(/)
    expect(avatar).toMatch(/<ProfileAvatarMark/)
    expect(avatar).toMatch(/object-cover/)
    expect(avatar).toMatch(/"xs"/)
  })

  it("uploads and removes photos from Settings instead of a URL field", () => {
    expect(settings).toMatch(/uploadAvatarAction/)
    expect(settings).toMatch(/removeAvatarAction/)
    expect(settings).toMatch(/type="file"/)
    expect(settings).toMatch(/avatarChooseFile/)
    expect(settings).toMatch(/prepareAvatarFile/)
    expect(settings).not.toMatch(/avatarUrl/)
    expect(actions).toMatch(/uploadAvatarAction/)
    expect(actions).toMatch(/removeAvatarAction/)
    expect(actions).toMatch(/AVATAR_BUCKET/)
    expect(actions).toMatch(/avatarObjectPath/)
  })

  it("caps avatar uploads at 512KB jpeg/png/webp and compresses oversized picks", () => {
    expect(AVATAR_BUCKET).toBe("avatars")
    expect(AVATAR_MAX_BYTES).toBe(512 * 1024)
    expect(AVATAR_MAX_EDGE).toBe(512)
    expect(avatarObjectPath("user-1")).toBe("user-1/avatar")
    expect(isAvatarMimeType("image/jpeg")).toBe(true)
    expect(isAvatarMimeType("image/png")).toBe(true)
    expect(isAvatarMimeType("image/webp")).toBe(true)
    expect(isAvatarMimeType("image/gif")).toBe(false)
    expect(compress).toMatch(/prepareAvatarFile/)
    expect(compress).toMatch(/fitAvatarSize/)
    expect(compress).toMatch(/image\/jpeg/)
    expect(fitAvatarSize(2000, 1000, 512)).toEqual({ width: 512, height: 256 })
    expect(fitAvatarSize(400, 300, 512)).toEqual({ width: 400, height: 300 })
  })

  it("passes through files that already fit the byte cap", async () => {
    const small = new File([new Uint8Array(32)], "tiny.png", { type: "image/png" })
    await expect(prepareAvatarFile(small)).resolves.toBe(small)
  })
})

describe("avatar interactions", () => {
  const community = read("components/community/CreationCommunity.tsx")
  const nav = read("components/layout/SiteNav.tsx")
  const queries = read("features/community/queries.ts")

  it("shows ProfileAvatar in conversation notes and composer", () => {
    expect(community).toMatch(/ProfileAvatar/)
    expect(community).toMatch(/avatarUrl/)
    expect(community).not.toMatch(/PixelMark/)
    expect(community).not.toMatch(/pixel-mark/)
  })

  it("loads avatar_url with comment authors", () => {
    expect(queries).toMatch(/avatar_url/)
    expect(queries).toMatch(/profiles \(username, display_name, avatar_url\)/)
  })

  it("shows the member avatar in site nav and tab bar", () => {
    expect(nav).toMatch(/ProfileAvatar/)
    expect(nav).toMatch(/avatarUrl/)
  })
})
