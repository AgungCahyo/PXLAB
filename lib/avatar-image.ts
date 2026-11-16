import { AVATAR_MAX_BYTES, AVATAR_MAX_EDGE, isAvatarMimeType } from "@/lib/site"

/** Fit inside a square box while keeping aspect ratio. */
export function fitAvatarSize(width: number, height: number, maxEdge: number) {
  if (width <= 0 || height <= 0 || maxEdge <= 0) {
    return { width: 1, height: 1 }
  }
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

/**
 * If the file is already within the byte cap, return it unchanged.
 * Otherwise resize (max edge) and re-encode as JPEG, stepping quality down until it fits.
 */
export async function prepareAvatarFile(
  file: File,
  maxBytes = AVATAR_MAX_BYTES,
  maxEdge = AVATAR_MAX_EDGE,
): Promise<File | null> {
  if (!(file instanceof File) || file.size === 0) return null
  if (!isAvatarMimeType(file.type) && !file.type.startsWith("image/")) return null
  if (file.size <= maxBytes) return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return null
  }

  try {
    let edge = Math.min(maxEdge, Math.max(bitmap.width, bitmap.height))
    const qualities = [0.85, 0.72, 0.6, 0.48, 0.36]

    for (let pass = 0; pass < 4; pass += 1) {
      const size = fitAvatarSize(bitmap.width, bitmap.height, edge)
      const canvas = document.createElement("canvas")
      canvas.width = size.width
      canvas.height = size.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return null
      ctx.fillStyle = "#FFFDF7"
      ctx.fillRect(0, 0, size.width, size.height)
      ctx.drawImage(bitmap, 0, 0, size.width, size.height)

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality)
        if (!blob) continue
        if (blob.size <= maxBytes) {
          return new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() })
        }
      }
      edge = Math.max(96, Math.round(edge * 0.75))
    }
  } finally {
    bitmap.close()
  }

  return null
}
