import { SITE_NAME } from "@/lib/site"
import type { ShareExportFormat } from "@/lib/share"
import { SHARE_EXPORT_FORMATS } from "@/lib/share"
import {
  mixHex,
  socialCardPalette,
  type SocialArtAspect,
  type SocialCardPalette,
} from "@/lib/share-palette"

export type SocialCardProps = {
  format: ShareExportFormat
  title: string
  displayName: string
  username: string
  /** @deprecated prefer displayName + username; kept for callers mid-migration */
  creatorLabel?: string
  artworkDataUrl: string | null
  showBrand?: boolean
  showCredit?: boolean
  aspect?: SocialArtAspect
  /** Intrinsic pixel size — required so Satori does not treat every cover as square. */
  artWidth?: number
  artHeight?: number
  palette?: SocialCardPalette
}

/**
 * Satori sizes <img> from width/height props — use a large aspect-correct box,
 * not the tiny pixel-canvas dimensions, so artwork scales to fill the stage.
 */
function intrinsicArtSize(
  aspect: SocialArtAspect,
  artWidth?: number,
  artHeight?: number,
) {
  const ratio =
    artWidth && artHeight && artWidth > 0 && artHeight > 0
      ? artWidth / artHeight
      : aspect === "landscape"
        ? 2
        : aspect === "portrait"
          ? 0.6
          : 1
  const maxEdge = 1200
  if (ratio >= 1) {
    return { width: maxEdge, height: Math.max(1, Math.round(maxEdge / ratio)) }
  }
  return { width: Math.max(1, Math.round(maxEdge * ratio)), height: maxEdge }
}

export function socialCardSize(format: ShareExportFormat) {
  return SHARE_EXPORT_FORMATS[format]
}

/**
 * JSX for next/og ImageResponse. Flexbox only.
 * OG: artwork-first horizontal split (~62% / ~38%).
 * Square / Story: artwork-dominant vertical stages.
 */
export function SocialCardMarkup({
  format,
  title,
  displayName,
  username,
  creatorLabel,
  artworkDataUrl,
  showBrand = true,
  showCredit = true,
  aspect = "square",
  artWidth,
  artHeight,
  palette,
}: SocialCardProps) {
  const colors = palette ?? socialCardPalette(null)
  const name = displayName || creatorLabel?.split("·")[0]?.trim() || username
  const handle = username ? `@${username.replace(/^@/, "")}` : ""
  const intrinsic = intrinsicArtSize(aspect, artWidth, artHeight)

  if (format === "og") {
    return (
      <OgSplitCard
        title={title}
        displayName={name}
        handle={handle}
        artworkDataUrl={artworkDataUrl}
        showBrand={showBrand}
        showCredit={showCredit}
        aspect={aspect}
        intrinsic={intrinsic}
        colors={colors}
      />
    )
  }

  return (
    <VerticalArtCard
      format={format}
      title={title}
      displayName={name}
      handle={handle}
      artworkDataUrl={artworkDataUrl}
      showBrand={showBrand}
      showCredit={showCredit}
      aspect={aspect}
      intrinsic={intrinsic}
      colors={colors}
    />
  )
}

function ArtworkStage({
  artworkDataUrl,
  colors,
  aspect,
  intrinsic,
  padPercent = 3,
}: {
  artworkDataUrl: string | null
  colors: SocialCardPalette
  aspect: SocialArtAspect
  intrinsic: { width: number; height: number }
  padPercent?: number
}) {
  // Tight pad so artwork fills the stage; portrait/landscape use intrinsic box for Satori.
  const pad =
    aspect === "portrait" ? Math.max(1.5, padPercent - 1.5) : aspect === "landscape" ? Math.max(1.5, padPercent - 0.5) : padPercent
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: colors.artStageBg,
        backgroundImage: `linear-gradient(145deg, ${colors.artStageBg} 0%, ${mixHex(colors.artStageBg, colors.accent, 0.22)} 100%)`,
        overflow: "hidden",
      }}
    >
      {artworkDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse requires <img>
        <img
          src={artworkDataUrl}
          alt=""
          width={intrinsic.width}
          height={intrinsic.height}
          style={{
            maxWidth: `${100 - pad * 2}%`,
            maxHeight: `${100 - pad * 2}%`,
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.panelMuted,
            fontSize: 36,
            letterSpacing: "0.12em",
            fontWeight: 700,
          }}
        >
          {SITE_NAME}
        </div>
      )}
    </div>
  )
}

function OgSplitCard({
  title,
  displayName,
  handle,
  artworkDataUrl,
  showBrand,
  showCredit,
  aspect,
  intrinsic,
  colors,
}: {
  title: string
  displayName: string
  handle: string
  artworkDataUrl: string | null
  showBrand: boolean
  showCredit: boolean
  aspect: SocialArtAspect
  intrinsic: { width: number; height: number }
  colors: SocialCardPalette
}) {
  // Landscape gets a slightly wider stage; portrait stays near 62% so tall art can grow.
  const artShare =
    !(showCredit || showBrand) ? 1 : aspect === "landscape" ? 0.68 : aspect === "portrait" ? 0.6 : 0.64

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.panelBg,
      }}
    >
      <div
        style={{
          display: "flex",
          width: `${Math.round(artShare * 100)}%`,
          height: "100%",
          flexShrink: 0,
        }}
      >
        <ArtworkStage
          artworkDataUrl={artworkDataUrl}
          colors={colors}
          aspect={aspect}
          intrinsic={intrinsic}
          padPercent={aspect === "landscape" ? 2 : 2.5}
        />
      </div>

      {showCredit || showBrand ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: `${100 - Math.round(artShare * 100)}%`,
            height: "100%",
            padding: "48px 40px",
            backgroundColor: colors.panelBg,
            backgroundImage: `linear-gradient(180deg, ${colors.panelBg} 0%, #0c0d12 100%)`,
          }}
        >
          {showBrand ? (
            <div
              style={{
                display: "flex",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: colors.accent,
              }}
            >
              {SITE_NAME}
            </div>
          ) : (
            <div style={{ display: "flex", height: 18 }} />
          )}

          {showCredit ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                flex: 1,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 42,
                  fontWeight: 700,
                  color: colors.panelFg,
                  lineHeight: 1.2,
                  maxHeight: 42 * 3.2,
                  overflow: "hidden",
                }}
              >
                {title.slice(0, 72)}
              </div>
              <div
                style={{
                  display: "flex",
                  width: 48,
                  height: 4,
                  backgroundColor: colors.accent,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 26,
                    fontWeight: 600,
                    color: colors.panelFg,
                    lineHeight: 1.25,
                  }}
                >
                  {displayName.slice(0, 40)}
                </div>
                {handle ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      color: colors.panelMuted,
                      lineHeight: 1.25,
                    }}
                  >
                    {handle.slice(0, 36)}
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1 }} />
          )}

          <div
            style={{
              display: "flex",
              fontSize: 16,
              color: colors.panelMuted,
              letterSpacing: "0.04em",
            }}
          >
            pxlb.fun
          </div>
        </div>
      ) : null}
    </div>
  )
}

function VerticalArtCard({
  format,
  title,
  displayName,
  handle,
  artworkDataUrl,
  showBrand,
  showCredit,
  aspect,
  intrinsic,
  colors,
}: {
  format: "square" | "story"
  title: string
  displayName: string
  handle: string
  artworkDataUrl: string | null
  showBrand: boolean
  showCredit: boolean
  aspect: SocialArtAspect
  intrinsic: { width: number; height: number }
  colors: SocialCardPalette
}) {
  const isStory = format === "story"
  const artFlex = showCredit || showBrand ? (isStory ? 0.78 : 0.82) : 1

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.panelBg,
      }}
    >
      <div style={{ display: "flex", flex: artFlex, minHeight: 0, width: "100%" }}>
        <ArtworkStage
          artworkDataUrl={artworkDataUrl}
          colors={colors}
          aspect={aspect}
          intrinsic={intrinsic}
          padPercent={isStory ? 3 : 2.5}
        />
      </div>

      {showCredit || showBrand ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: isStory ? "36px 44px 44px" : "28px 36px 36px",
            gap: 20,
            backgroundColor: colors.panelBg,
          }}
        >
          {showCredit ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: isStory ? 40 : 34,
                  fontWeight: 700,
                  color: colors.panelFg,
                  lineHeight: 1.2,
                  maxHeight: (isStory ? 40 : 34) * 2.5,
                  overflow: "hidden",
                }}
              >
                {title.slice(0, 72)}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: isStory ? 26 : 22,
                  color: colors.panelMuted,
                }}
              >
                {[displayName, handle].filter(Boolean).join("  ·  ").slice(0, 56)}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flex: 1 }} />
          )}
          {showBrand ? (
            <div
              style={{
                display: "flex",
                fontSize: isStory ? 22 : 18,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: colors.accent,
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
