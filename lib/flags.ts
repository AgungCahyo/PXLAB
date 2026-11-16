/** Retired for `/space` after B5. Playground owns PixelBoard. The env var may still exist. */
export function pixelCanvasPrototypeEnabled() {
  return process.env.NEXT_PUBLIC_PIXEL_CANVAS_PROTOTYPE === "true"
}
