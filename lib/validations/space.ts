import { z } from "zod"
import {
  SPACE_CONTENT_JSON_MAX,
  SPACE_DEFAULT_CIRCLE_R,
  SPACE_DEFAULT_RECT,
  SPACE_SIZE,
  SPACE_TEXT_MAX,
  VISUAL_FILLS,
} from "@/lib/site"

const fill = z.enum(VISUAL_FILLS)
const coord = z.number().min(0).max(SPACE_SIZE)
const size = z.number().min(1).max(SPACE_SIZE)

export const spaceIdSchema = z.uuid()

export const spaceTextContentSchema = z
  .object({
    version: z.literal(1),
    body: z.string().trim().min(1).max(SPACE_TEXT_MAX),
    fill,
    fontSize: z.union([z.literal(16), z.literal(24), z.literal(36)]),
  })
  .strict()

export const spaceShapeContentSchema = z
  .object({
    version: z.literal(1),
    shape: z.enum(["rectangle", "circle"]),
    fill,
  })
  .strict()

export type SpaceTextContent = z.infer<typeof spaceTextContentSchema>
export type SpaceShapeContent = z.infer<typeof spaceShapeContentSchema>
export type SpaceContent = SpaceTextContent | SpaceShapeContent

export const addSpaceTextSchema = z
  .object({
    element_type: z.literal("text"),
    position_x: coord,
    position_y: coord,
    content: spaceTextContentSchema,
  })
  .strict()

export const addSpaceShapeSchema = z
  .object({
    element_type: z.literal("shape"),
    position_x: coord,
    position_y: coord,
    width: size,
    height: size.optional(),
    content: spaceShapeContentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.content.shape === "rectangle") {
      if (value.height == null) {
        ctx.addIssue({ code: "custom", message: "invalid_input", path: ["height"] })
        return
      }
      if (value.position_x + value.width > SPACE_SIZE || value.position_y + value.height > SPACE_SIZE) {
        ctx.addIssue({ code: "custom", message: "invalid_input", path: ["position_x"] })
      }
    }
    if (value.content.shape === "circle") {
      const r = value.width / 2
      if (
        value.position_x - r < 0 ||
        value.position_x + r > SPACE_SIZE ||
        value.position_y - r < 0 ||
        value.position_y + r > SPACE_SIZE
      ) {
        ctx.addIssue({ code: "custom", message: "invalid_input", path: ["position_x"] })
      }
    }
  })

export const addSpaceElementSchema = z.discriminatedUnion("element_type", [
  addSpaceTextSchema,
  addSpaceShapeSchema,
])

export const moveSpaceElementSchema = z
  .object({
    id: spaceIdSchema,
    position_x: coord,
    position_y: coord,
  })
  .strict()

export function parseSpaceContentJson(raw: string) {
  if (raw.length > SPACE_CONTENT_JSON_MAX) return { success: false as const, error: "payload_too_large" as const }
  try {
    return { success: true as const, data: JSON.parse(raw) as unknown }
  } catch {
    return { success: false as const, error: "invalid_input" as const }
  }
}

export function defaultRectPlacement(x: number, y: number, fill: (typeof VISUAL_FILLS)[number]) {
  const width = SPACE_DEFAULT_RECT.width
  const height = SPACE_DEFAULT_RECT.height
  return {
    element_type: "shape" as const,
    position_x: clamp(x, 0, SPACE_SIZE - width),
    position_y: clamp(y, 0, SPACE_SIZE - height),
    width,
    height,
    content: { version: 1 as const, shape: "rectangle" as const, fill },
  }
}

export function defaultCirclePlacement(x: number, y: number, fill: (typeof VISUAL_FILLS)[number]) {
  const r = SPACE_DEFAULT_CIRCLE_R
  return {
    element_type: "shape" as const,
    position_x: clamp(x, r, SPACE_SIZE - r),
    position_y: clamp(y, r, SPACE_SIZE - r),
    width: r * 2,
    content: { version: 1 as const, shape: "circle" as const, fill },
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
