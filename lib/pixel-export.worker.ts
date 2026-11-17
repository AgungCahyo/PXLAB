/// <reference lib="webworker" />

import {
  exportPngForDownload,
  type DownloadBackground,
  type DownloadExportMode,
} from "./pixel-png-scale"

export type PixelExportWorkerRequest = {
  id: number
  pngBuffer: ArrayBuffer
  mode: DownloadExportMode
  background: DownloadBackground
}

export type PixelExportWorkerResponse =
  | { id: number; ok: true; bytes: ArrayBuffer; byteLength: number }
  | { id: number; ok: false; error: string }

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (event: MessageEvent<PixelExportWorkerRequest>) => {
  const { id, pngBuffer, mode, background } = event.data
  void (async () => {
    try {
      const blob = await exportPngForDownload(
        new Blob([pngBuffer], { type: "image/png" }),
        mode,
        background,
      )
      const bytes = await blob.arrayBuffer()
      const response: PixelExportWorkerResponse = {
        id,
        ok: true,
        bytes,
        byteLength: bytes.byteLength,
      }
      ctx.postMessage(response, [bytes])
    } catch (err) {
      const response: PixelExportWorkerResponse = {
        id,
        ok: false,
        error: err instanceof Error ? err.message : "export",
      }
      ctx.postMessage(response)
    }
  })()
}
