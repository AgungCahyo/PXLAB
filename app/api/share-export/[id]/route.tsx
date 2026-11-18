import { ImageResponse } from "next/og"
import { connection } from "next/server"
import {
  isShareExportFormat,
  shareCacheControl,
  type ShareExportFormat,
} from "@/lib/share"
import { SocialCardMarkup, socialCardSize } from "@/lib/share-card"
import { loadPublishedSharePayload } from "@/lib/share-server"

/**
 * Social Media Export Studio formats (published only).
 * Query: format=og|square|story, brand=0|1, credit=0|1
 * Does not mutate the original creation.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  await connection()

  const { searchParams } = new URL(request.url)
  const formatRaw = searchParams.get("format") ?? "og"
  if (!isShareExportFormat(formatRaw)) {
    return new Response("Invalid format", { status: 400 })
  }
  const format: ShareExportFormat = formatRaw
  const showBrand = searchParams.get("brand") !== "0"
  const showCredit = searchParams.get("credit") !== "0"

  const payload = await loadPublishedSharePayload(id, "en")
  if (!payload) {
    return new Response(null, { status: 404 })
  }

  const size = socialCardSize(format)
  return new ImageResponse(
    (
      <SocialCardMarkup
        format={format}
        title={payload.title}
        displayName={payload.displayName}
        username={payload.username}
        artworkDataUrl={payload.artworkDataUrl}
        aspect={payload.aspect}
        artWidth={payload.artWidth}
        artHeight={payload.artHeight}
        palette={payload.palette}
        showBrand={showBrand}
        showCredit={showCredit}
      />
    ),
    {
      ...size,
      headers: {
        "Cache-Control": shareCacheControl(payload.updatedAt),
        "Content-Disposition": `inline; filename="pxlb-${id}-${format}.png"`,
      },
    },
  )
}
