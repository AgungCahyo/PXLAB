import { NextResponse } from "next/server"
import { connection } from "next/server"
import { canDownloadCreationPng } from "@/lib/auth/permissions"
import { getSessionUserId } from "@/lib/auth/session"
import { getOwnedCreation, getPublishedCreation } from "@/features/creations/queries"
import {
  logPixelDownload,
  pixelDownloadViewerKind,
} from "@/lib/pixel-download-log"
import { PIXEL_BUCKET, pixelObjectPath } from "@/lib/site"
import { createPublicSupabase } from "@/lib/supabase/public"
import { createServerSupabase } from "@/lib/supabase/server"
import { creationIdSchema } from "@/lib/validations/creation"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!creationIdSchema.safeParse(id).success) {
    logPixelDownload({
      creationId: id,
      outcome: "invalid_id",
      viewer: "anon",
    })
    return new NextResponse(null, { status: 404 })
  }

  await connection()

  const viewerId = await getSessionUserId()
  const published = await getPublishedCreation(id)
  if (published?.type === "pixel") {
    const viewer = pixelDownloadViewerKind(viewerId, published.user_id)
    if (
      !canDownloadCreationPng({
        viewerId,
        ownerId: published.user_id,
        status: published.status,
        allowPngDownload: published.allow_png_download,
      })
    ) {
      logPixelDownload({
        creationId: id,
        outcome: "forbidden",
        viewer,
        allowPngDownload: published.allow_png_download,
      })
      return new NextResponse(null, { status: 403 })
    }
    return serveDownloadPng({
      userId: published.user_id,
      creationId: id,
      title: published.title,
      client: viewerId === published.user_id ? "owner" : "public",
      viewer,
      allowPngDownload: published.allow_png_download,
    })
  }

  const owned = await getOwnedCreation(id)
  if (owned?.type === "pixel") {
    const viewer = pixelDownloadViewerKind(viewerId, owned.user_id)
    if (
      !canDownloadCreationPng({
        viewerId,
        ownerId: owned.user_id,
        status: owned.status,
        allowPngDownload: owned.allow_png_download,
      })
    ) {
      logPixelDownload({
        creationId: id,
        outcome: "forbidden",
        viewer,
        allowPngDownload: owned.allow_png_download,
      })
      return new NextResponse(null, { status: 403 })
    }
    return serveDownloadPng({
      userId: owned.user_id,
      creationId: id,
      title: owned.title,
      client: "owner",
      viewer,
      allowPngDownload: owned.allow_png_download,
    })
  }

  logPixelDownload({
    creationId: id,
    outcome: "not_found",
    viewer: viewerId ? "member" : "anon",
  })
  return new NextResponse(null, { status: 404 })
}

function pngDownloadFilename(title: string, creationId: string) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
  return `${base || "artwork"}-${creationId.slice(0, 8)}.png`
}

async function serveDownloadPng(args: {
  userId: string
  creationId: string
  title: string
  client: "public" | "owner"
  viewer: "owner" | "member" | "anon"
  allowPngDownload: boolean
}) {
  const supabase = args.client === "public" ? createPublicSupabase() : await createServerSupabase()
  if (!supabase) {
    logPixelDownload({
      creationId: args.creationId,
      outcome: "not_found",
      viewer: args.viewer,
      allowPngDownload: args.allowPngDownload,
    })
    return new NextResponse(null, { status: 404 })
  }

  const path = pixelObjectPath(args.userId, args.creationId, "cover.png")
  const { data, error } = await supabase.storage.from(PIXEL_BUCKET).download(path)
  if (error || !data) {
    logPixelDownload({
      creationId: args.creationId,
      outcome: "not_found",
      viewer: args.viewer,
      allowPngDownload: args.allowPngDownload,
    })
    return new NextResponse(null, { status: 404 })
  }

  const bytes = await data.arrayBuffer()
  const filename = pngDownloadFilename(args.title, args.creationId)
  logPixelDownload({
    creationId: args.creationId,
    outcome: "ok",
    viewer: args.viewer,
    allowPngDownload: args.allowPngDownload,
  })
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
