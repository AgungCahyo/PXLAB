import { describe, expect, it } from "vitest"
import { addSpaceElementSchema, defaultCirclePlacement, moveSpaceElementSchema } from "@/lib/validations/space"

describe("addSpaceElementSchema", () => {
  it("accepts a text element inside the canvas", () => {
    const result = addSpaceElementSchema.safeParse({
      element_type: "text",
      position_x: 40,
      position_y: 80,
      content: { version: 1, body: "hello", fill: "#9a45e0", fontSize: 24 },
    })
    expect(result.success).toBe(true)
  })

  it("rejects extra content keys and disallowed fills", () => {
    expect(
      addSpaceElementSchema.safeParse({
        element_type: "text",
        position_x: 0,
        position_y: 0,
        content: { version: 1, body: "hi", fill: "#ff0000", fontSize: 24 },
      }).success,
    ).toBe(false)
  })

  it("rejects a rectangle that overflows the canvas", () => {
    const result = addSpaceElementSchema.safeParse({
      element_type: "shape",
      position_x: 900,
      position_y: 900,
      width: 200,
      height: 200,
      content: { version: 1, shape: "rectangle", fill: "#9a45e0" },
    })
    expect(result.success).toBe(false)
  })

  it("accepts a circle that fits", () => {
    const result = addSpaceElementSchema.safeParse(defaultCirclePlacement(200, 200, "#2f6f5e"))
    expect(result.success).toBe(true)
  })
})

describe("moveSpaceElementSchema", () => {
  it("rejects coordinates outside 0–1000", () => {
    expect(
      moveSpaceElementSchema.safeParse({
        id: "11111111-1111-1111-1111-111111111111",
        position_x: 1001,
        position_y: 10,
      }).success,
    ).toBe(false)
  })
})
