import { ImageResponse } from "next/og"
import { connection } from "next/server"
import { SocialCardMarkup, socialCardSize } from "@/lib/share-card"
import { shareCacheControl } from "@/lib/share"
import { loadPublishedSharePayload } from "@/lib/share-server"

/**
 * Default Open Graph / Twitter preview: 1200×630.
 * Published creations only — drafts return 404 (no metadata leak).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  await connection()

  const payload = await loadPublishedSharePayload(id, "en")
  if (!payload) {
    return new Response(null, { status: 404 })
  }

  const size = socialCardSize("og")
  return new ImageResponse(
    (
      <SocialCardMarkup
        format="og"
        title={payload.title}
        displayName={payload.displayName}
        username={payload.username}
        artworkDataUrl={payload.artworkDataUrl}
        aspect={payload.aspect}
        artWidth={payload.artWidth}
        artHeight={payload.artHeight}
        palette={payload.palette}
        showBrand
        showCredit
      />
    ),
    {
      ...size,
      headers: {
        "Cache-Control": shareCacheControl(payload.updatedAt),
      },
    },
  )
}
