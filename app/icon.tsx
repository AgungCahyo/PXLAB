import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

/** PXLB favicon — four PXLB pixel blocks on crisp white. */
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
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 24,
            height: 24,
            gap: 4,
          }}
        >
          <div style={{ width: 10, height: 10, background: "#ff4f00" }} />
          <div style={{ width: 10, height: 10, background: "#15803d" }} />
          <div style={{ width: 10, height: 10, background: "#d97706" }} />
          <div style={{ width: 10, height: 10, background: "#e4002b" }} />
        </div>
      </div>
    ),
    size,
  )
}
