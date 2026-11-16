import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const cell = {
    width: 10,
    height: 10,
    borderRadius: 999,
    border: "1.5px solid #f4f2ef",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0a12",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 22,
            height: 22,
            gap: 2,
          }}
        >
          <div style={{ ...cell, background: "transparent" }} />
          <div style={{ ...cell, background: "transparent" }} />
          <div style={{ ...cell, background: "transparent" }} />
          <div style={{ ...cell, background: "#9a45e0" }} />
        </div>
      </div>
    ),
    size,
  );
}
