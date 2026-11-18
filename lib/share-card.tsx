import { SITE_NAME } from "@/lib/site"
import type { ShareExportFormat } from "@/lib/share"
import { SHARE_EXPORT_FORMATS } from "@/lib/share"
import {
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
  /** Intrinsic pixel size — used only to derive aspect-correct Satori box. */
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
 * Social preview markup for next/og ImageResponse (flexbox only).
 * Warm editorial system — independent from website theme.
 *
 * Layout adapts by aspect:
 * - landscape → stacked (maximize horizontal art)
 * - square / portrait → art-dominant with warm caption band
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
    // Landscape: stack to maximize horizontal display width.
    // Square + portrait: side caption so art can use full 630px height.
    if (aspect === "landscape") {
      return (
        <OgStackedCard
          title={title}
          displayName={name}
          handle={handle}
          artworkDataUrl={artworkDataUrl}
          showBrand={showBrand}
          showCredit={showCredit}
          aspect={aspect}
          intrinsic={intrinsic}
          colors={colors}
          artFlex={0.86}
        />
      )
    }
    return (
      <OgSideCaptionCard
        title={title}
        displayName={name}
        handle={handle}
        artworkDataUrl={artworkDataUrl}
        showBrand={showBrand}
        showCredit={showCredit}
        aspect={aspect}
        intrinsic={intrinsic}
        colors={colors}
        artShare={aspect === "portrait" ? 0.56 : 0.62}
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
  const pad =
    aspect === "portrait"
      ? Math.max(1.5, padPercent - 1)
      : aspect === "landscape"
        ? Math.max(1.5, padPercent - 0.5)
        : padPercent

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        backgroundColor: colors.artStageBg,
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
            color: colors.muted,
            fontSize: 32,
            letterSpacing: "0.1em",
            fontWeight: 700,
          }}
        >
          {SITE_NAME}
        </div>
      )}
    </div>
  )
}

function CreditBlock({
  title,
  displayName,
  handle,
  showBrand,
  showCredit,
  colors,
  titleSize,
  nameSize,
  handleSize,
  brandSize,
  direction = "column",
}: {
  title: string
  displayName: string
  handle: string
  showBrand: boolean
  showCredit: boolean
  colors: SocialCardPalette
  titleSize: number
  nameSize: number
  handleSize: number
  brandSize: number
  direction?: "column" | "row"
}) {
  const isRow = direction === "row"
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: isRow ? "flex-end" : "flex-start",
        justifyContent: isRow ? "space-between" : "flex-start",
        gap: isRow ? 20 : 12,
        width: "100%",
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
              display: "flex",
              fontSize: titleSize,
              fontWeight: 700,
              color: colors.ink,
              lineHeight: 1.2,
              maxHeight: titleSize * 2.6,
              overflow: "hidden",
            }}
          >
            {title.slice(0, 72)}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "baseline",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 600,
                color: colors.ink,
              }}
            >
              {displayName.slice(0, 40)}
            </div>
            {handle ? (
              <div
                style={{
                  display: "flex",
                  fontSize: handleSize,
                  color: colors.muted,
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
      {showBrand ? (
        <div
          style={{
            display: "flex",
            fontSize: brandSize,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: colors.accent,
            flexShrink: 0,
          }}
        >
          {SITE_NAME}
        </div>
      ) : null}
    </div>
  )
}

/** Landscape + square: art stacked above a warm caption band. */
function OgStackedCard({
  title,
  displayName,
  handle,
  artworkDataUrl,
  showBrand,
  showCredit,
  aspect,
  intrinsic,
  colors,
  artFlex,
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
  artFlex: number
}) {
  const hasMeta = showCredit || showBrand
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.artStageBg,
      }}
    >
      <div
        style={{
          display: "flex",
          flex: hasMeta ? artFlex : 1,
          minHeight: 0,
          width: "100%",
        }}
      >
        <ArtworkStage
          artworkDataUrl={artworkDataUrl}
          colors={colors}
          aspect={aspect}
          intrinsic={intrinsic}
          padPercent={aspect === "landscape" ? 1.5 : 2}
        />
      </div>
      {hasMeta ? (
        <div
          style={{
            display: "flex",
            padding: "24px 40px 28px",
            backgroundColor: colors.artStageBg,
          }}
        >
          <CreditBlock
            title={title}
            displayName={displayName}
            handle={handle}
            showBrand={showBrand}
            showCredit={showCredit}
            colors={colors}
            titleSize={aspect === "landscape" ? 34 : 36}
            nameSize={22}
            handleSize={20}
            brandSize={15}
            direction="row"
          />
        </div>
      ) : null}
    </div>
  )
}

/** Portrait: tall art uses full height; warm side caption (never a dark panel). */
function OgSideCaptionCard({
  title,
  displayName,
  handle,
  artworkDataUrl,
  showBrand,
  showCredit,
  aspect,
  intrinsic,
  colors,
  artShare,
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
  artShare: number
}) {
  const hasMeta = showCredit || showBrand
  const share = hasMeta ? artShare : 1

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.artStageBg,
      }}
    >
      <div
        style={{
          display: "flex",
          width: `${Math.round(share * 100)}%`,
          height: "100%",
          flexShrink: 0,
        }}
      >
        <ArtworkStage
          artworkDataUrl={artworkDataUrl}
          colors={colors}
          aspect={aspect}
          intrinsic={intrinsic}
          padPercent={2}
        />
      </div>
      {hasMeta ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: `${100 - Math.round(share * 100)}%`,
            height: "100%",
            padding: "40px 36px",
            backgroundColor: colors.artStageBg,
          }}
        >
          <CreditBlock
            title={title}
            displayName={displayName}
            handle={handle}
            showBrand={showBrand}
            showCredit={showCredit}
            colors={colors}
            titleSize={36}
            nameSize={22}
            handleSize={20}
            brandSize={15}
            direction="column"
          />
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
  const artFlex = showCredit || showBrand ? (isStory ? 0.8 : 0.84) : 1

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.artStageBg,
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
            padding: isStory ? "32px 40px 40px" : "24px 32px 32px",
            backgroundColor: colors.artStageBg,
          }}
        >
          <CreditBlock
            title={title}
            displayName={displayName}
            handle={handle}
            showBrand={showBrand}
            showCredit={showCredit}
            colors={colors}
            titleSize={isStory ? 38 : 32}
            nameSize={isStory ? 24 : 20}
            handleSize={isStory ? 22 : 18}
            brandSize={isStory ? 18 : 15}
            direction="row"
          />
        </div>
      ) : null}
    </div>
  )
}
