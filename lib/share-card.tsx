import { SITE_NAME } from "@/lib/site"
import type { ShareExportFormat } from "@/lib/share"
import { SHARE_EXPORT_FORMATS } from "@/lib/share"

const COLORS = {
  bg: "#fffdf7",
  soft: "#f4f1e8",
  fg: "#282b35",
  muted: "#5c5866",
  earth: "#936037",
  card: "#ffffff",
  brick: "#e94b3c",
} as const

export type SocialCardProps = {
  format: ShareExportFormat
  title: string
  creatorLabel: string
  artworkDataUrl: string | null
  showBrand?: boolean
  showCredit?: boolean
}

export function socialCardSize(format: ShareExportFormat) {
  return SHARE_EXPORT_FORMATS[format]
}

/**
 * JSX for next/og ImageResponse. Flexbox only; no Tailwind.
 * Artwork is contained — never stretched — with room for title/credit.
 */
export function SocialCardMarkup({
  format,
  title,
  creatorLabel,
  artworkDataUrl,
  showBrand = true,
  showCredit = true,
}: SocialCardProps) {
  const isStory = format === "story"
  const isSquare = format === "square"
  const pad = isStory ? 56 : isSquare ? 48 : 40
  const artFlex = isStory ? 0.72 : showCredit ? 0.78 : 0.92
  const titleSize = isStory ? 42 : isSquare ? 36 : 34
  const creditSize = isStory ? 28 : 24

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.bg,
        backgroundImage:
          "linear-gradient(180deg, #fffdf7 0%, #f4f1e8 100%)",
        padding: pad,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: artFlex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.soft,
          border: `6px solid ${COLORS.earth}`,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {artworkDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires <img>
          <img
            src={artworkDataUrl}
            alt=""
            width={1200}
            height={1200}
            style={{
              maxWidth: "92%",
              maxHeight: "92%",
              objectFit: "contain",
              imageRendering: "pixelated",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.muted,
              fontSize: 28,
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: COLORS.brick,
                letterSpacing: "0.08em",
              }}
            >
              {SITE_NAME}
            </div>
            <div>Pixel art</div>
          </div>
        )}
      </div>

      {showCredit || showBrand ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: isStory ? 36 : 28,
            gap: 24,
            minHeight: showCredit ? (isStory ? 110 : 88) : 40,
          }}
        >
          {showCredit ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: titleSize,
                  fontWeight: 700,
                  color: COLORS.fg,
                  lineHeight: 1.25,
                  maxHeight: titleSize * 2.6,
                  overflow: "hidden",
                }}
              >
                {title.slice(0, 80)}
              </div>
              <div
                style={{
                  fontSize: creditSize,
                  color: COLORS.muted,
                  lineHeight: 1.3,
                }}
              >
                {creatorLabel.slice(0, 60)}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          {showBrand ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `4px solid ${COLORS.earth}`,
                backgroundColor: COLORS.card,
                color: COLORS.fg,
                fontSize: isStory ? 26 : 22,
                fontWeight: 700,
                letterSpacing: "0.1em",
                padding: "10px 16px",
                flexShrink: 0,
              }}
            >
              {SITE_NAME}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
