import { describe, expect, it } from "vitest"
import { normalizeCreationTag } from "@/lib/creations"
import { CREATION_CAPTION_MAX } from "@/lib/site"
import {
  creationCaptionSchema,
  creationTagsSchema,
  emptyCreationContent,
  parseCreationContent,
  updateCreationSchema,
  visualContentSchema,
} from "@/lib/validations/creation"

describe("parseCreationContent", () => {
  it("accepts a text draft with an empty body", () => {
    const result = parseCreationContent("text", { version: 1, body: "" }, "draft")
    expect(result.success).toBe(true)
  })

  it("rejects publishing empty text", () => {
    const result = parseCreationContent("text", { version: 1, body: "   " }, "publish")
    expect(result.success).toBe(false)
  })

  it("rejects extra keys", () => {
    const result = parseCreationContent(
      "idea",
      { version: 1, body: "hello", context: "", extra: true },
      "draft",
    )
    expect(result.success).toBe(false)
  })

  it("rejects a visual with disallowed fill", () => {
    const result = visualContentSchema.safeParse({
      version: 1,
      elements: [{ type: "rect", x: 0, y: 0, width: 10, height: 10, fill: "#ff0000" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects publishing a visual with no elements", () => {
    const result = parseCreationContent("visual", { version: 1, elements: [] }, "publish")
    expect(result.success).toBe(false)
  })

  it("accepts a published visual rectangle", () => {
    const result = parseCreationContent(
      "visual",
      {
        version: 1,
        elements: [{ type: "rect", x: 10, y: 10, width: 40, height: 40, fill: "#9a45e0" }],
      },
      "publish",
    )
    expect(result.success).toBe(true)
  })
})

describe("emptyCreationContent", () => {
  it("starts text/visual at v1 and pixel drafts at v2", () => {
    expect(emptyCreationContent("text")).toEqual({ version: 1, body: "" })
    expect(emptyCreationContent("visual")).toEqual({ version: 1, elements: [] })
    expect(emptyCreationContent("pixel")).toMatchObject({
      version: 2,
      width: 64,
      height: 64,
      encoding: "rle-index",
      source_path: "",
    })
    expect(emptyCreationContent("pixel", { width: 128, height: 64 })).toMatchObject({
      width: 128,
      height: 64,
    })
    expect(
      emptyCreationContent("pixel", { width: 64, height: 64, stage_ground: "ink" }),
    ).toMatchObject({ stage_ground: "ink" })
  })
})

describe("pixel header", () => {
  const header = emptyCreationContent("pixel")

  it("accepts a draft without a stored source", () => {
    const result = parseCreationContent("pixel", header, "draft")
    expect(result.success).toBe(true)
  })

  it("rejects publishing before a source is stored", () => {
    const result = parseCreationContent("pixel", header, "publish")
    expect(result.success).toBe(false)
  })

  it("accepts a publish header with a source path", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, source_path: "user/id/source.json" },
      "publish",
    )
    expect(result.success).toBe(true)
  })

  it("accepts a custom size in the header", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, width: 128, height: 64 },
      "draft",
    )
    expect(result.success).toBe(true)
  })

  it("rejects a canvas side above 1024", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, width: 1025, height: 16 },
      "draft",
    )
    expect(result.success).toBe(false)
  })

  it("accepts a custom hex color in the header", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, palette: ["#FFFDF7", "#000000", "#00AAFF"] },
      "draft",
    )
    expect(result.success).toBe(true)
  })

  it("accepts content version 1 and 2", () => {
    expect(
      parseCreationContent("pixel", { ...header, version: 1 }, "draft").success,
    ).toBe(true)
    expect(
      parseCreationContent("pixel", { ...header, version: 2 }, "draft").success,
    ).toBe(true)
  })

  it("rejects a non-hex palette color in the header", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, palette: ["#FFFDF7", "red"] },
      "draft",
    )
    expect(result.success).toBe(false)
  })

  it("rejects a header palette longer than 64", () => {
    const palette = Array.from({ length: 65 }, (_, index) =>
      index === 0 ? "#FFFDF7" : `#${index.toString(16).padStart(6, "0")}`,
    )
    const result = parseCreationContent("pixel", { ...header, palette }, "draft")
    expect(result.success).toBe(false)
  })
})

describe("creationCaptionSchema", () => {
  it("turns blank caption into null", () => {
    expect(creationCaptionSchema.safeParse("   ").success).toBe(true)
    expect(creationCaptionSchema.safeParse("   ").data).toBeNull()
    expect(creationCaptionSchema.safeParse(undefined).data).toBeNull()
  })

  it("trims a non-empty caption", () => {
    const result = creationCaptionSchema.safeParse("  hello world  ")
    expect(result.success).toBe(true)
    expect(result.data).toBe("hello world")
  })

  it(`rejects captions longer than ${CREATION_CAPTION_MAX}`, () => {
    const result = creationCaptionSchema.safeParse("a".repeat(CREATION_CAPTION_MAX + 1))
    expect(result.success).toBe(false)
  })

  it(`accepts captions of ${CREATION_CAPTION_MAX} characters`, () => {
    const value = "a".repeat(CREATION_CAPTION_MAX)
    const result = creationCaptionSchema.safeParse(value)
    expect(result.success).toBe(true)
    expect(result.data).toBe(value)
  })
})

describe("creation tags", () => {
  it("normalizes case, hash, and rejects bad tags", () => {
    expect(normalizeCreationTag("#Nature")).toBe("nature")
    expect(normalizeCreationTag("pixel_art")).toBe("pixel_art")
    expect(normalizeCreationTag("#")).toBeNull()
    expect(normalizeCreationTag("a")).toBeNull()
    expect(normalizeCreationTag("bad-tag")).toBeNull()
  })

  it("dedupes and caps at five from JSON", () => {
    const result = creationTagsSchema.safeParse(
      JSON.stringify(["#Nature", "nature", "pixelart", "landscape", "character", "extra"]),
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual(["nature", "pixelart", "landscape", "character", "extra"])
  })

  it("rejects an invalid token", () => {
    const result = creationTagsSchema.safeParse(JSON.stringify(["ok", "bad-tag"]))
    expect(result.success).toBe(false)
  })
})

describe("updateCreationSchema", () => {
  it("accepts unpublish without deleting the work", () => {
    const result = updateCreationSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Sky",
      caption: "",
      tags: "[]",
      intent: "unpublish",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.caption).toBeNull()
      expect(result.data.tags).toEqual([])
    }
  })

  it("accepts a caption with the update payload", () => {
    const result = updateCreationSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Sky",
      caption: "Drawn at dawn",
      tags: JSON.stringify(["pixelart"]),
      intent: "draft",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.caption).toBe("Drawn at dawn")
      expect(result.data.tags).toEqual(["pixelart"])
    }
  })
})
