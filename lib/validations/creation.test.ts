import { describe, expect, it } from "vitest"
import {
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
  it("starts each type at version 1", () => {
    expect(emptyCreationContent("text")).toEqual({ version: 1, body: "" })
    expect(emptyCreationContent("visual")).toEqual({ version: 1, elements: [] })
    expect(emptyCreationContent("pixel")).toMatchObject({
      version: 1,
      width: 64,
      height: 64,
      encoding: "rle-index",
      source_path: "",
    })
    expect(emptyCreationContent("pixel", { width: 128, height: 64 })).toMatchObject({
      width: 128,
      height: 64,
    })
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

  it("rejects a canvas side above 512", () => {
    const result = parseCreationContent(
      "pixel",
      { ...header, width: 513, height: 16 },
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

describe("updateCreationSchema", () => {
  it("accepts unpublish without deleting the work", () => {
    const result = updateCreationSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Sky",
      intent: "unpublish",
    })
    expect(result.success).toBe(true)
  })
})
