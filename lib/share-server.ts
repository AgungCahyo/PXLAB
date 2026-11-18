import { getPublishedCreation } from "@/features/creations/queries"
import { displayTitle } from "@/lib/creations"
import type { Lang } from "@/lib/i18n"
import {
  socialArtAspect,
  socialCardPalette,
  type SocialArtAspect,
  type SocialCardPalette,
} from "@/lib/share-palette"
import { PIXEL_BUCKET, pixelObjectPath } from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"
import { creationIdSchema, pixelContentSchema } from "@/lib/validations/creation"

export type PublishedSharePayload = {
  id: string
  title: string
  updatedAt: string
  displayName: string
  username: string
  /** Combined label for older call sites / QR text. */
  creatorLabel: string
  artworkDataUrl: string | null
  aspect: SocialArtAspect
  artWidth: number
  artHeight: number
  palette: SocialCardPalette
}

/** Published-only share payload. Drafts / hidden never resolve. */
export async function loadPublishedSharePayload(
  id: string,
  lang: Lang = "en",
): Promise<PublishedSharePayload | null> {
  if (!creationIdSchema.safeParse(id).success) return null
  const creation = await getPublishedCreation(id)
  if (!creation) return null

  const username = creation.author.username || "member"
  const displayName = creation.author.displayName?.trim() || username
  const creatorLabel = `${displayName} · @${username}`

  let aspect: SocialArtAspect = "square"
  let artWidth = 64
  let artHeight = 64
  if (creation.type === "pixel") {
    const parsed = pixelContentSchema.safeParse(creation.content)
    if (parsed.success) {
      artWidth = parsed.data.width
      artHeight = parsed.data.height
      aspect = socialArtAspect(artWidth, artHeight)
    }
  }

  const palette = socialCardPalette(creation.color_usage)

  let artworkDataUrl: string | null = null
  if (creation.type === "pixel") {
    artworkDataUrl = await loadPublishedCoverDataUrl(creation.user_id, creation.id)
  } else if (creation.cover_url?.startsWith("http")) {
    artworkDataUrl = await fetchRemoteImageAsDataUrl(creation.cover_url)
  }

  return {
    id: creation.id,
    title: displayTitle(creation.title, lang),
    updatedAt: creation.updated_at,
    displayName,
    username,
    creatorLabel,
    artworkDataUrl,
    aspect,
    artWidth,
    artHeight,
    palette,
  }
}

async function loadPublishedCoverDataUrl(userId: string, creationId: string) {
  const supabase = createPublicSupabase()
  if (!supabase) return null
  const path = pixelObjectPath(userId, creationId, "cover.png")
  const { data, error } = await supabase.storage.from(PIXEL_BUCKET).download(path)
  if (error || !data) return null
  const bytes = Buffer.from(await data.arrayBuffer())
  return `data:image/png;base64,${bytes.toString("base64")}`
}

async function fetchRemoteImageAsDataUrl(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const type = res.headers.get("content-type") ?? "image/png"
    if (!type.startsWith("image/")) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${bytes.toString("base64")}`
  } catch {
    return null
  }
}
