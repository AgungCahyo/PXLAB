import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (p: string) => readFileSync(path.join(root, p), "utf8")

function walk(dir: string): string[] {
  const abs = path.join(root, dir)
  return readdirSync(abs).flatMap((name) => {
    const rel = path.join(dir, name)
    return statSync(path.join(root, rel)).isDirectory() ? walk(rel) : [rel]
  })
}

describe("social interactions reuse the existing backend", () => {
  const post = read("components/social/FeedPost.tsx")
  const panel = read("components/social/CommentPanel.tsx")

  it("like goes through toggleAppreciationAction, optimistic, with explicit desired state", () => {
    expect(post).toMatch(/toggleAppreciationAction/)
    expect(post).toMatch(/reconcileDesiredState/)
    expect(post).toMatch(/formData\.set\("desired", String\(desired\)\)/)
    expect(post).toMatch(/aria-pressed/)
    expect(post).toMatch(/loginHref/)
  })

  it("share opens CreationShareDialog from the feed action", () => {
    expect(post).toMatch(/CreationShareDialog/)
    expect(post).toMatch(/setShareOpen\(true\)/)
    expect(post).toMatch(/workActionClass/)
  })

  it("comments post through addCommentAction and guard double submit", () => {
    expect(panel).toMatch(/addCommentAction/)
    expect(panel).toMatch(/sendingRef/)
    expect(panel).toMatch(/COMMENT_BODY_MAX/)
  })

  it("no fake backend: no bookmark/save UI was invented", () => {
    for (const file of walk("components/social")) {
      expect(read(file).toLowerCase()).not.toMatch(/bookmark/)
    }
  })

  it("home route is public and the nav links to it", () => {
    expect(read("components/layout/SocialNav.tsx")).toMatch(/HOME_FEED_READY = true/)
    expect(read("app/[lang]/(public)/home/page.tsx")).toMatch(/following/)
  })
})

describe("studio & engine boundary", () => {
  const forbidden =
    /(PlaygroundForm|Studio[A-Z]\w*|VisualEditor|VisualCanvas|LayerPanel|BrushOptionsPanel|ColorPicker|DocumentPaletteDialog|ImportPixelArtDialog|PixelNewForm|components\/canvas|lib\/pixel|virgin-draft|features\/creations\/actions|\(member\)\/create)/

  const files = [
    ...walk("components/social"),
    ...walk("features/feed"),
    ...walk("features/explore"),
    ...walk("app/[lang]/(public)/home"),
    "components/layout/SocialNav.tsx",
    "lib/copy-social.ts",
    "lib/social-feed.ts",
    "lib/social-like.ts",
    "lib/social-time.ts",
  ]

  it.each(files)("%s does not import Studio/Engine code", (file) => {
    const imports = read(file).split("\n").filter((line) => /^\s*(import|export)\b.*from\s/.test(line))
    for (const line of imports) expect(line).not.toMatch(forbidden)
  })
})
