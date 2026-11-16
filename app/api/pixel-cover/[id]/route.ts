import { NextResponse } from "next/server"
import { connection } from "next/server"
import { getOwnedCreation, getPublishedCreation } from "@/features/creations/queries"
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
    return new NextResponse(null, { status: 404 })
  }

  await connection()

  const published = await getPublishedCreation(id)
  if (published?.type === "pixel") {
    return serveCover({
      userId: published.user_id,
      creationId: id,
      cache: "public, max-age=60",
      client: "public",
    })
  }

  const owned = await getOwnedCreation(id)
  if (owned?.type === "pixel") {
    return serveCover({
      userId: owned.user_id,
      creationId: id,
      cache: "private, no-store",
      client: "owner",
    })
  }

  return new NextResponse(null, { status: 404 })
}

async function serveCover(args: {
  userId: string
  creationId: string
  cache: string
  client: "public" | "owner"
}) {
  const supabase = args.client === "public" ? createPublicSupabase() : await createServerSupabase()
  if (!supabase) return new NextResponse(null, { status: 404 })

  const path = pixelObjectPath(args.userId, args.creationId, "cover.png")
  const { data, error } = await supabase.storage.from(PIXEL_BUCKET).download(path)
  if (error || !data) return new NextResponse(null, { status: 404 })

  const bytes = await data.arrayBuffer()
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": args.cache,
    },
  })
}
