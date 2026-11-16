import { z } from "zod"
import { normalizeCreationTag } from "@/lib/creations"
import {
  PIXEL_CANVAS_MAX,
  PIXEL_CANVAS_MIN,
  PIXEL_SIZE_PRESETS,
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PALETTE,
  PIXEL_PAPER,
  PIXEL_SOURCE_ENCODING,
  PIXEL_SOURCE_VERSION,
  isPixelCanvasSize,
  isPixelHexColor,
  normalizePixelHex,
} from "@/lib/pixel"
import {
  CREATION_CAPTION_MAX,
  CREATION_TAGS_MAX,
  CREATION_CONTENT_JSON_MAX,
  CREATION_IDEA_BODY_MAX,
  CREATION_IDEA_CONTEXT_MAX,
  CREATION_STORY_BODY_MAX,
  CREATION_STORY_PROMPT_MAX,
  CREATION_TEXT_BODY_MAX,
  CREATION_TITLE_MAX,
  CREATION_TYPES,
  CREATION_VISUAL_MAX_ELEMENTS,
  CREATION_VISUAL_TEXT_MAX,
  SPACE_SIZE,
  VISUAL_FILLS,
  type CreationType,
} from "@/lib/site"

const coord = z.number().min(0).max(SPACE_SIZE)
const fill = z.enum(VISUAL_FILLS)

export const creationTypeSchema = z.enum(CREATION_TYPES)
export const creationTitleSchema = z.string().trim().min(1).max(CREATION_TITLE_MAX)
/** Empty / whitespace → null. Max CREATION_CAPTION_MAX after trim is enforced by max on raw then trim. */
export const creationCaptionSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z
    .string()
    .max(CREATION_CAPTION_MAX)
    .transform((value) => {
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : null
    }),
)
export const creationIdSchema = z.uuid()

function tagsFromUnknown(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== "string") return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) return parsed.map(String)
  } catch {
    /* comma / space separated */
  }
  return trimmed.split(/[\s,]+/).filter(Boolean)
}

/** Optional tags from FormData JSON array or comma list. Max 5, normalized, unique. */
export const creationTagsSchema = z.preprocess(tagsFromUnknown, z.array(z.string()).superRefine((items, ctx) => {
  const out: string[] = []
  for (const item of items) {
    const raw = item.trim()
    if (!raw) continue
    const tag = normalizeCreationTag(raw)
    if (!tag) {
      ctx.addIssue({ code: "custom", message: "tag" })
      return
    }
    if (!out.includes(tag)) out.push(tag)
    if (out.length > CREATION_TAGS_MAX) {
      ctx.addIssue({ code: "custom", message: "tags_max" })
      return
    }
  }
}).transform((items) => {
  const out: string[] = []
  for (const item of items) {
    const tag = normalizeCreationTag(item)
    if (!tag || out.includes(tag)) continue
    out.push(tag)
    if (out.length >= CREATION_TAGS_MAX) break
  }
  return out
}))

export const visualRectSchema = z
  .object({
    type: z.literal("rect"),
    x: coord,
    y: coord,
    width: z.number().min(1).max(SPACE_SIZE),
    height: z.number().min(1).max(SPACE_SIZE),
    fill,
  })
  .strict()

export const visualCircleSchema = z
  .object({
    type: z.literal("circle"),
    x: coord,
    y: coord,
    r: z.number().min(1).max(SPACE_SIZE / 2),
    fill,
  })
  .strict()

export const visualTextSchema = z
  .object({
    type: z.literal("text"),
    x: coord,
    y: coord,
    body: z.string().trim().min(1).max(CREATION_VISUAL_TEXT_MAX),
    fill,
  })
  .strict()

export const visualElementSchema = z.discriminatedUnion("type", [
  visualRectSchema,
  visualCircleSchema,
  visualTextSchema,
])

export const visualContentSchema = z
  .object({
    version: z.literal(1),
    elements: z.array(visualElementSchema).max(CREATION_VISUAL_MAX_ELEMENTS),
  })
  .strict()

export const textContentSchema = z
  .object({
    version: z.literal(1),
    body: z.string().max(CREATION_TEXT_BODY_MAX),
  })
  .strict()

export const ideaContentSchema = z
  .object({
    version: z.literal(1),
    body: z.string().max(CREATION_IDEA_BODY_MAX),
    context: z.string().max(CREATION_IDEA_CONTEXT_MAX),
  })
  .strict()

export const storyContentSchema = z
  .object({
    version: z.literal(1),
    body: z.string().max(CREATION_STORY_BODY_MAX),
    continuation_prompt: z.string().max(CREATION_STORY_PROMPT_MAX),
  })
  .strict()

const pixelSide = z.number().int().min(PIXEL_CANVAS_MIN).max(PIXEL_CANVAS_MAX)

export const pixelContentSchema = z
  .object({
    version: z.literal(PIXEL_SOURCE_VERSION),
    width: pixelSide,
    height: pixelSide,
    palette: z.array(z.string()).min(1).max(PIXEL_DOCUMENT_PALETTE_MAX),
    encoding: z.literal(PIXEL_SOURCE_ENCODING),
    source_path: z.string().max(200),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!isPixelCanvasSize(value.width, value.height)) {
      ctx.addIssue({ code: "custom", message: "size", path: ["width"] })
    }
    if (normalizePixelHex(value.palette[0] ?? "") !== PIXEL_PAPER) {
      ctx.addIssue({ code: "custom", message: "palette", path: ["palette"] })
    }
    if (!value.palette.every((color) => isPixelHexColor(color))) {
      ctx.addIssue({ code: "custom", message: "palette", path: ["palette"] })
    }
  })

export type TextContent = z.infer<typeof textContentSchema>
export type IdeaContent = z.infer<typeof ideaContentSchema>
export type StoryContent = z.infer<typeof storyContentSchema>
export type VisualContent = z.infer<typeof visualContentSchema>
export type VisualElement = z.infer<typeof visualElementSchema>
export type PixelContent = z.infer<typeof pixelContentSchema>
export type CreationContent = TextContent | IdeaContent | StoryContent | VisualContent | PixelContent

export function emptyCreationContent(
  type: CreationType,
  size?: { width: number; height: number },
): CreationContent {
  switch (type) {
    case "pixel": {
      const fallback = PIXEL_SIZE_PRESETS.find((item) => item.id === "sprite") ?? PIXEL_SIZE_PRESETS[2]
      const width = size?.width ?? fallback.width
      const height = size?.height ?? fallback.height
      return {
        version: PIXEL_SOURCE_VERSION,
        width,
        height,
        palette: [...PIXEL_PALETTE],
        encoding: PIXEL_SOURCE_ENCODING,
        source_path: "",
      }
    }
    case "text":
      return { version: 1, body: "" }
    case "idea":
      return { version: 1, body: "", context: "" }
    case "story":
      return { version: 1, body: "", continuation_prompt: "" }
    case "visual":
      return { version: 1, elements: [] }
  }
}

function schemaForType(type: CreationType) {
  if (type === "pixel") return pixelContentSchema
  if (type === "text") return textContentSchema
  if (type === "idea") return ideaContentSchema
  if (type === "story") return storyContentSchema
  return visualContentSchema
}

export function parseCreationContent(
  type: CreationType,
  input: unknown,
  mode: "draft" | "publish",
) {
  const parsed = schemaForType(type).safeParse(input)
  if (!parsed.success) return parsed

  if (JSON.stringify(parsed.data).length > CREATION_CONTENT_JSON_MAX) {
    return { success: false as const, error: "payload_too_large" as const }
  }

  if (mode === "publish") {
    if (type === "pixel") {
      const content = parsed.data as PixelContent
      if (!content.source_path) {
        return { success: false as const, error: "invalid_input" as const }
      }
    } else if (type === "visual") {
      const content = parsed.data as VisualContent
      if (content.elements.length < 1) {
        return { success: false as const, error: "invalid_input" as const }
      }
    } else {
      const body = (parsed.data as TextContent | IdeaContent | StoryContent).body.trim()
      if (!body) return { success: false as const, error: "invalid_input" as const }
    }
  }

  return parsed
}

export const createDraftSchema = z.object({
  title: creationTitleSchema,
  type: creationTypeSchema,
  width: pixelSide.optional(),
  height: pixelSide.optional(),
})

export const updateCreationSchema = z.object({
  id: creationIdSchema,
  title: creationTitleSchema,
  caption: creationCaptionSchema,
  tags: creationTagsSchema,
  intent: z.enum(["draft", "publish", "unpublish"]),
})
