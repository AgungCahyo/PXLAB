import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { canDownloadCreationPng, canForkCreation } from "@/lib/auth/permissions"

const owner = "11111111-1111-1111-1111-111111111111"
const other = "22222222-2222-2222-2222-222222222222"
const root = path.join(__dirname, "..")

describe("canDownloadCreationPng", () => {
  it("always allows the owner for draft and published", () => {
    expect(
      canDownloadCreationPng({
        viewerId: owner,
        ownerId: owner,
        status: "draft",
        allowPngDownload: false,
      }),
    ).toBe(true)
    expect(
      canDownloadCreationPng({
        viewerId: owner,
        ownerId: owner,
        status: "published",
        allowPngDownload: false,
      }),
    ).toBe(true)
  })

  it("allows guests and other members only when published and flag is on", () => {
    expect(
      canDownloadCreationPng({
        viewerId: null,
        ownerId: owner,
        status: "published",
        allowPngDownload: true,
      }),
    ).toBe(true)
    expect(
      canDownloadCreationPng({
        viewerId: other,
        ownerId: owner,
        status: "published",
        allowPngDownload: true,
      }),
    ).toBe(true)
    expect(
      canDownloadCreationPng({
        viewerId: null,
        ownerId: owner,
        status: "published",
        allowPngDownload: false,
      }),
    ).toBe(false)
    expect(
      canDownloadCreationPng({
        viewerId: other,
        ownerId: owner,
        status: "draft",
        allowPngDownload: true,
      }),
    ).toBe(false)
    expect(
      canDownloadCreationPng({
        viewerId: other,
        ownerId: owner,
        status: "hidden",
        allowPngDownload: true,
      }),
    ).toBe(false)
  })

  it("does not couple download permission to fork", () => {
    expect(
      canForkCreation({ sessionUserId: other, creationStatus: "published" }),
    ).toBe(true)
    expect(
      canDownloadCreationPng({
        viewerId: other,
        ownerId: owner,
        status: "published",
        allowPngDownload: false,
      }),
    ).toBe(false)
    expect(
      canForkCreation({ sessionUserId: null, creationStatus: "published" }),
    ).toBe(false)
    expect(
      canDownloadCreationPng({
        viewerId: null,
        ownerId: owner,
        status: "published",
        allowPngDownload: true,
      }),
    ).toBe(true)
  })
})

describe("pixel-download route (DL1)", () => {
  const route = readFileSync(
    path.join(root, "app/api/pixel-download/[id]/route.ts"),
    "utf8",
  )
  const migration = readFileSync(
    path.join(root, "supabase/migrations/20261117005000_creation_allow_png_download.sql"),
    "utf8",
  )

  it("defaults allow_png_download to false and grants only authenticated column writes", () => {
    expect(migration).toMatch(/allow_png_download boolean not null default false/)
    expect(migration).toMatch(/grant insert \(allow_png_download\)/)
    expect(migration).toMatch(/grant update \(allow_png_download\)/)
    expect(migration).not.toMatch(/to anon/)
  })

  it("enforces permission helper and no-store attachment headers", () => {
    expect(route).toMatch(/canDownloadCreationPng/)
    expect(route).toMatch(/Cache-Control": "private, no-store"/)
    expect(route).toMatch(/Content-Disposition/)
    expect(route).toMatch(/attachment/)
    expect(route).not.toMatch(/max-age/)
  })
})

describe("download UI (DL2)", () => {
  const menu = readFileSync(path.join(root, "components/creations/CreationMoreMenu.tsx"), "utf8")
  const playground = readFileSync(path.join(root, "components/creations/PlaygroundForm.tsx"), "utf8")
  const actions = readFileSync(path.join(root, "features/creations/actions.ts"), "utf8")
  const copySrc = readFileSync(path.join(root, "lib/copy.ts"), "utf8")

  it("wires detail and Playground to the download menu and permission action", () => {
    expect(menu).toMatch(/updateAllowPngDownloadAction/)
    expect(menu).toMatch(/api\/pixel-download/)
    expect(menu).toMatch(/allowPngDownload/)
    expect(playground).toMatch(/CreationMoreMenu/)
    expect(playground).toMatch(/variant="embedded"/)
    expect(actions).toMatch(/updateAllowPngDownloadAction/)
    expect(copySrc).toMatch(/downloadArtwork/)
    expect(copySrc).toMatch(/allowPngDownload/)
    expect(copySrc).toMatch(/downloadDisclaimer/)
  })
})

describe("download storage posture (DL3)", () => {
  const route = readFileSync(path.join(root, "app/api/pixel-download/[id]/route.ts"), "utf8")
  const cover = readFileSync(path.join(root, "app/api/pixel-cover/[id]/route.ts"), "utf8")
  const logHelper = readFileSync(path.join(root, "lib/pixel-download-log.ts"), "utf8")
  const pixelSql = readFileSync(
    path.join(root, "supabase/migrations/20261116100000_pixel_creations.sql"),
    "utf8",
  )
  const audit = readFileSync(path.join(root, "docs/ARTWORK-DOWNLOAD-PERMISSION-AUDIT.md"), "utf8")

  it("keeps public published covers for display while download stays mediated and logged", () => {
    expect(pixelSql).toMatch(/pixel_covers_public_select/)
    expect(cover).toMatch(/public, max-age=60/)
    expect(route).toMatch(/logPixelDownload/)
    expect(route).toMatch(/private, no-store/)
    expect(logHelper).toMatch(/\[pixel-download\]/)
    expect(logHelper).not.toMatch(/userAgent|user-agent|ip\b/i)
    expect(audit).toMatch(/Tetap Opsi A/)
    expect(audit).toMatch(/## 9\. DL3/)
  })
})
