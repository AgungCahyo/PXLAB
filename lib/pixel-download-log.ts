export type PixelDownloadLogEvent = {
  creationId: string
  outcome: "ok" | "forbidden" | "not_found" | "invalid_id"
  viewer: "owner" | "member" | "anon"
  allowPngDownload?: boolean
}

/** Structured server log for official PNG downloads. Not a durable analytics store. */
export function logPixelDownload(event: PixelDownloadLogEvent) {
  console.info(
    "[pixel-download]",
    JSON.stringify({
      ...event,
      at: new Date().toISOString(),
    }),
  )
}

export function pixelDownloadViewerKind(
  viewerId: string | null,
  ownerId: string,
): PixelDownloadLogEvent["viewer"] {
  if (!viewerId) return "anon"
  if (viewerId === ownerId) return "owner"
  return "member"
}
