"use client"

import {
  exportPngForDownload,
  type DownloadBackground,
  type DownloadExportMode,
} from "@/lib/pixel-png-scale"
import type {
  PixelExportWorkerRequest,
  PixelExportWorkerResponse,
} from "@/lib/pixel-export.worker"

type Pending = {
  resolve: (blob: Blob) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let workerFailed = false
let nextId = 1
const pending = new Map<number, Pending>()

function failPending(error: Error) {
  for (const entry of pending.values()) entry.reject(error)
  pending.clear()
}

function getWorker(): Worker | null {
  if (workerFailed || typeof window === "undefined") return null
  if (worker) return worker
  try {
    const next = new Worker(new URL("./pixel-export.worker.ts", import.meta.url), {
      type: "module",
    })
    next.onmessage = (event: MessageEvent<PixelExportWorkerResponse>) => {
      const data = event.data
      const entry = pending.get(data.id)
      if (!entry) return
      pending.delete(data.id)
      if (data.ok) {
        entry.resolve(new Blob([data.bytes], { type: "image/png" }))
        return
      }
      entry.reject(new Error(data.error || "export"))
    }
    next.onerror = () => {
      workerFailed = true
      failPending(new Error("worker"))
      next.terminate()
      worker = null
    }
    worker = next
    return worker
  } catch {
    workerFailed = true
    return null
  }
}

/**
 * Export PNG for download on a worker when available; falls back to main thread.
 */
export async function exportPngForDownloadClient(
  source: Blob,
  mode: DownloadExportMode,
  background: DownloadBackground = "transparent",
): Promise<Blob> {
  const active = getWorker()
  if (!active) return exportPngForDownload(source, mode, background)

  const id = nextId++
  const pngBuffer = await source.arrayBuffer()
  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    try {
      const message: PixelExportWorkerRequest = { id, pngBuffer, mode, background }
      active.postMessage(message, [pngBuffer])
    } catch {
      pending.delete(id)
      void exportPngForDownload(source, mode, background).then(resolve, reject)
    }
  }).catch(async (error) => {
    if (!workerFailed) throw error
    return exportPngForDownload(source, mode, background)
  })
}
