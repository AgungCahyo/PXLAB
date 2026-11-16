import { isUnnamedTitle } from "@/lib/creations"
import { pixelContentSchema } from "@/lib/validations/creation"

/** Draft created on size pick, never saved to storage — safe to delete on leave. */
export function isVirginPixelDraft(creation: {
  type: string
  status: string
  title: string
  cover_url: string | null
  content: unknown
}): boolean {
  if (creation.type !== "pixel" || creation.status !== "draft") return false
  if (creation.cover_url) return false
  if (!isUnnamedTitle(creation.title)) return false
  const header = pixelContentSchema.safeParse(creation.content)
  if (!header.success) return false
  return !header.data.source_path
}
