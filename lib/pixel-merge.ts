import { blendOverPixel, isPlainBlend } from "@/lib/pixel-blend"
import { layerEffectivelyHidden, type PixelGroupRuntime } from "@/lib/pixel-groups"
import {
  compositeLayersToRgba,
  flattenLayersToIndices,
  hexToRgb,
  layerBlend,
  layerOpacity,
  mergeLayerIndices,
  PIXEL_DOCUMENT_PALETTE_MAX,
  PIXEL_PAPER,
  rgbToHex,
  type PixelLayerRuntime,
} from "@/lib/pixel"

/**
 * Baking layers together in an indexed document.
 *
 * A blended or semi-transparent result is an arbitrary RGB colour, but layers store palette
 * indices. The resolver maps each result colour to an existing palette entry, appends a new one
 * while there is room, and only then falls back to the nearest existing colour. Plain layers
 * (normal, 100%) never touch the palette and use the original index-copy paths unchanged.
 */
export type PaletteResolver = {
  /** The live palette (grows as colours are added). */
  readonly palette: string[]
  /** Number of colours appended so far. */
  readonly added: number
  /** Distinct colours that did not fit and were mapped to the nearest existing entry. */
  readonly approximated: number
  resolve: (r: number, g: number, b: number) => number
}

export function createPaletteResolver(
  palette: readonly string[],
  max = PIXEL_DOCUMENT_PALETTE_MAX,
): PaletteResolver {
  const live = [...palette]
  const rgb: Array<[number, number, number]> = live.map((hex) => hexToRgb(hex))
  const exact = new Map<number, number>()
  const key = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b
  for (let i = 0; i < rgb.length; i += 1) {
    const k = key(rgb[i]![0], rgb[i]![1], rgb[i]![2])
    if (!exact.has(k)) exact.set(k, i)
  }
  let added = 0
  let approximated = 0
  const resolver: PaletteResolver = {
    palette: live,
    get added() {
      return added
    },
    get approximated() {
      return approximated
    },
    resolve(r, g, b) {
      const k = key(r, g, b)
      const hit = exact.get(k)
      if (hit !== undefined) return hit
      if (live.length < max) {
        live.push(rgbToHex([r, g, b]))
        rgb.push([r, g, b])
        exact.set(k, live.length - 1)
        added += 1
        return live.length - 1
      }
      let best = 0
      let bestDist = Infinity
      for (let i = 0; i < rgb.length; i += 1) {
        const c = rgb[i]!
        const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      exact.set(k, best)
      approximated += 1
      return best
    },
  }
  return resolver
}

/**
 * Merge `upper` onto `lower`. `lowerIsBase`: lower is the bottom of the stack, so its index 0 is
 * opaque Paper; otherwise index 0 is transparent and receives the source colour at full strength
 * (a layer cannot keep partial transparency in an indexed document).
 */
export function bakeMergeDown(
  lower: PixelLayerRuntime,
  upper: PixelLayerRuntime,
  lowerIsBase: boolean,
  palette: readonly string[],
  resolver: PaletteResolver,
): Uint8Array {
  const opacity = layerOpacity(upper)
  const mode = layerBlend(upper)
  if (isPlainBlend(opacity, mode)) return mergeLayerIndices(lower.indices, upper.indices, true)
  const out = new Uint8Array(lower.indices)
  if (opacity === 0) return out
  const scratch = new Uint8ClampedArray(4)
  const length = Math.min(lower.indices.length, upper.indices.length)
  for (let i = 0; i < length; i += 1) {
    const u = upper.indices[i]!
    if (u === 0) continue
    const l = lower.indices[i]!
    if (!lowerIsBase && l === 0) {
      out[i] = u
      continue
    }
    const [br, bg, bb] = hexToRgb(palette[l] ?? PIXEL_PAPER)
    const [sr, sg, sb] = hexToRgb(palette[u] ?? PIXEL_PAPER)
    scratch[0] = br
    scratch[1] = bg
    scratch[2] = bb
    scratch[3] = 255
    blendOverPixel(scratch, 0, sr, sg, sb, opacity, mode)
    out[i] = resolver.resolve(scratch[0]!, scratch[1]!, scratch[2]!)
  }
  return out
}

/** Flatten every visible layer into one index buffer (what you see is what you get). */
export function bakeVisibleLayers(
  layers: readonly PixelLayerRuntime[],
  width: number,
  height: number,
  palette: readonly string[],
  resolver: PaletteResolver,
  groups: readonly PixelGroupRuntime[] = [],
): Uint8Array {
  const visible = layers.filter((layer) => !layerEffectivelyHidden(layer, groups) && layerOpacity(layer) > 0)
  const groupsPlain = groups.every((group) => isPlainBlend(group.opacity, group.blend))
  if (groupsPlain && visible.every((layer) => isPlainBlend(layerOpacity(layer), layerBlend(layer)))) {
    return flattenLayersToIndices(layers, width, height, groups)
  }
  const rgba = new Uint8ClampedArray(width * height * 4)
  compositeLayersToRgba(layers, rgba, palette, width, height, null, groups)
  const out = new Uint8Array(width * height)
  const painted = new Uint8Array(width * height)
  layers.forEach((layer, layerIndex) => {
    if (layerEffectivelyHidden(layer, groups) || layerOpacity(layer) === 0) return
    for (let i = 0; i < painted.length; i += 1) {
      if (layerIndex === 0 || layer.indices[i] !== 0) painted[i] = 1
    }
  })
  for (let i = 0; i < out.length; i += 1) {
    if (!painted[i]) continue
    const p = i * 4
    out[i] = resolver.resolve(rgba[p]!, rgba[p + 1]!, rgba[p + 2]!)
  }
  return out
}
