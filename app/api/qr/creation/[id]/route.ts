import QRCode from "qrcode"
import { connection } from "next/server"
import { getPublishedCreation } from "@/features/creations/queries"
import { creationCanonicalUrl, shareCacheControl } from "@/lib/share"
import { creationIdSchema } from "@/lib/validations/creation"

/**
 * QR for the canonical creation URL (no UTM).
 * Published only — drafts return 404.
 * ?format=png|svg — default png. Quiet zone + high contrast via QR defaults.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!creationIdSchema.safeParse(id).success) {
    return new Response(null, { status: 404 })
  }

  await connection()

  const creation = await getPublishedCreation(id)
  if (!creation) {
    return new Response(null, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") === "svg" ? "svg" : "png"
  // Default lang for canonical host path; both locales resolve the same creation.
  const url = creationCanonicalUrl("en", creation.id)

  const cache = shareCacheControl(creation.updated_at)

  if (format === "svg") {
    const svg = await QRCode.toString(url, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: { dark: "#282b35", light: "#fffdf7" },
    })
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": cache,
        "Content-Disposition": `inline; filename="pxlb-${id}-qr.svg"`,
      },
    })
  }

  const png = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#282b35", light: "#fffdf7" },
  })

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cache,
      "Content-Disposition": `inline; filename="pxlb-${id}-qr.png"`,
    },
  })
}
