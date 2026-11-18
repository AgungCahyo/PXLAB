import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

/** PXLB favicon — four Classic Pixel Adventure blocks on Paper. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fffdf7",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 24,
            height: 24,
            gap: 2,
          }}
        >
          <div style={{ width: 11, height: 11, background: "#59bceb" }} />
          <div style={{ width: 11, height: 11, background: "#45a849" }} />
          <div style={{ width: 11, height: 11, background: "#ffd447" }} />
          <div style={{ width: 11, height: 11, background: "#e94b3c" }} />
        </div>
      </div>
    ),
    size,
  )
}
