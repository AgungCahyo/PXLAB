"use client"

import { memo, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { stripLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export type PixelWorldScene =
  | "home"
  | "explore"
  | "create"
  | "playground"
  | "detail"
  | "profile"
  | "works"
  | "auth"
  | "space"
  | "settings"
  | "admin"
  | "default"

export function pixelWorldSceneFromPath(pathname: string): PixelWorldScene {
  const path = stripLang(pathname)
  if (path === "/") return "home"
  if (path === "/explore" || path.startsWith("/explore/")) return "explore"
  if (path === "/create") return "create"
  if (path.startsWith("/create/")) return "playground"
  if (path.startsWith("/creation/")) return "detail"
  if (path.startsWith("/u/")) return "profile"
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "works"
  if (path === "/responses" || path.startsWith("/responses/")) return "works"
  if (
    path === "/activity" ||
    path === "/insights" ||
    path === "/saved" ||
    path === "/liked" ||
    path === "/archive"
  ) {
    return "works"
  }
  if (
    path === "/login" ||
    path === "/register" ||
    path === "/forgot-password" ||
    path.startsWith("/reset-password")
  ) {
    return "auth"
  }
  if (path === "/space" || path.startsWith("/space/")) return "space"
  if (path === "/settings" || path.startsWith("/settings/")) return "settings"
  if (path === "/profile/edit" || path.startsWith("/profile/edit/")) return "settings"
  if (path === "/admin" || path.startsWith("/admin/")) return "admin"
  return "default"
}

/* ───────────── Pixel parts (warna dari tema) ───────────── */

type PartProps = { className?: string; x?: number; y?: number; wide?: boolean }

function Part({ className, x = 0, y = 0, children }: PartProps & { children: ReactNode }) {
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      {children}
    </g>
  )
}

function Cloud(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="8" y="12" width="48" height="12" className="fill-card opacity-90" />
      <rect x="16" y="4" width="32" height="12" className="fill-card opacity-90" />
      <rect x="22" y="0" width="16" height="8" className="fill-card opacity-90" />
      <rect x="4" y="16" width="56" height="8" className="fill-card opacity-90" />
      <rect x="8" y="24" width="48" height="4" className="fill-soft opacity-70" />
    </Part>
  )
}

function Hill({ wide, ...p }: PartProps) {
  const w = wide ? 112 : 64
  const m = w / 2
  return (
    <Part {...p}>
      <rect x={m - 16} y="0" width="32" height="8" className="fill-grass opacity-50" />
      <rect x={m - 28} y="8" width="56" height="8" className="fill-grass opacity-50" />
      <rect x={m - 40} y="16" width="80" height="8" className="fill-grass opacity-50" />
      <rect x="0" y="24" width={w} height="24" className="fill-grass opacity-50" />
      <rect x={m - 12} y="3" width="12" height="4" className="fill-soft opacity-40" />
    </Part>
  )
}

function Bush(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="8" y="0" width="16" height="8" className="fill-grass opacity-80" />
      <rect x="24" y="2" width="12" height="8" className="fill-grass opacity-80" />
      <rect x="4" y="8" width="40" height="8" className="fill-grass opacity-80" />
      <rect x="0" y="12" width="48" height="8" className="fill-grass opacity-80" />
      <rect x="10" y="2" width="6" height="4" className="fill-soft opacity-40" />
    </Part>
  )
}

function Tree(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="12" y="24" width="8" height="20" className="fill-earth opacity-70" />
      <rect x="4" y="12" width="24" height="16" className="fill-grass opacity-70" />
      <rect x="8" y="4" width="16" height="12" className="fill-grass opacity-70" />
      <rect x="12" y="0" width="8" height="8" className="fill-grass opacity-70" />
      <rect x="10" y="8" width="4" height="4" className="fill-soft opacity-40" />
    </Part>
  )
}

function Stone(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="0" y="4" width="20" height="12" className="fill-earth opacity-60" />
      <rect x="4" y="0" width="12" height="8" className="fill-earth opacity-65" />
      <rect x="8" y="8" width="4" height="4" className="fill-soft opacity-60" />
    </Part>
  )
}

function Brick(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="0" y="0" width="28" height="16" className="fill-brick opacity-70" />
      <rect x="0" y="0" width="28" height="2" className="fill-soft opacity-50" />
      <rect x="0" y="7" width="28" height="2" className="fill-earth opacity-60" />
      <rect x="13" y="0" width="2" height="8" className="fill-earth opacity-60" />
      <rect x="6" y="8" width="2" height="8" className="fill-earth opacity-60" />
      <rect x="20" y="8" width="2" height="8" className="fill-earth opacity-60" />
    </Part>
  )
}

function Coin(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="4" y="0" width="8" height="16" className="fill-coin opacity-90" />
      <rect x="2" y="2" width="12" height="12" className="fill-coin opacity-90" />
      <rect x="6" y="3" width="4" height="10" className="fill-soft opacity-60" />
    </Part>
  )
}

function Flower(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="5" y="8" width="2" height="8" className="fill-grass opacity-80" />
      <rect x="2" y="0" width="8" height="8" className="fill-coin opacity-85" />
      <rect x="0" y="2" width="12" height="4" className="fill-coin opacity-85" />
      <rect x="4" y="2" width="4" height="4" className="fill-card opacity-90" />
    </Part>
  )
}

function Star(p: PartProps) {
  return (
    <Part {...p}>
      <rect x="6" y="0" width="4" height="16" className="fill-coin opacity-85" />
      <rect x="0" y="6" width="16" height="4" className="fill-coin opacity-85" />
      <rect x="4" y="4" width="8" height="8" className="fill-coin opacity-85" />
    </Part>
  )
}

const PARTS = {
  cloud: Cloud,
  hill: Hill,
  bush: Bush,
  tree: Tree,
  stone: Stone,
  brick: Brick,
  coin: Coin,
  flower: Flower,
  star: Star,
} as const

type Item = { k: keyof typeof PARTS; x: number; y: number; c?: string; wide?: boolean }

/* Urutan array = belakang → depan. Dasar tanah viewBox y=180. */
const GROUND = 180
const MEADOW: Item[] = [
  { k: "cloud", x: 24, y: 18, c: "pixel-world-drift-a" },
  { k: "cloud", x: 180, y: 30, c: "pixel-world-drift-b" },
  { k: "hill", x: -10, y: GROUND - 48, wide: true },
  { k: "hill", x: 200, y: GROUND - 48 },
  { k: "tree", x: 270, y: GROUND - 44 },
  { k: "bush", x: 110, y: GROUND - 20 },
  { k: "flower", x: 60, y: GROUND - 16 },
  { k: "coin", x: 150, y: 110, c: "pixel-world-bob" },
]

const ART: Record<Exclude<PixelWorldScene, "playground">, Item[]> = {
  home: MEADOW,
  default: MEADOW,

  explore: [
    { k: "cloud", x: 40, y: 16, c: "pixel-world-drift-a" },
    { k: "cloud", x: 200, y: 24, c: "pixel-world-drift-b" },
    { k: "hill", x: -20, y: GROUND - 48, wide: true },
    { k: "hill", x: 170, y: GROUND - 48, wide: true },
    { k: "tree", x: 40, y: GROUND - 44 },
    { k: "bush", x: 90, y: GROUND - 20 },
    { k: "flower", x: 250, y: GROUND - 16 },
  ],

  create: [
    { k: "cloud", x: 210, y: 20, c: "pixel-world-drift-a" },
    { k: "hill", x: -30, y: GROUND - 48, wide: true },
    { k: "stone", x: 48, y: GROUND - 16 },
    { k: "stone", x: 280, y: GROUND - 16 },
    { k: "coin", x: 60, y: 100, c: "pixel-world-bob" },
  ],

  detail: [
    { k: "cloud", x: 220, y: 22, c: "pixel-world-drift-b" },
    { k: "bush", x: 20, y: GROUND - 20 },
    { k: "stone", x: 276, y: GROUND - 16 },
  ],

  profile: [
    { k: "cloud", x: 30, y: 20, c: "pixel-world-drift-a" },
    { k: "hill", x: 180, y: GROUND - 48 },
    { k: "bush", x: 60, y: GROUND - 20 },
    { k: "flower", x: 130, y: GROUND - 16 },
    { k: "flower", x: 150, y: GROUND - 16 },
    { k: "stone", x: 240, y: GROUND - 16 },
  ],

  works: [
    { k: "cloud", x: 60, y: 18, c: "pixel-world-drift-a" },
    { k: "brick", x: 28, y: GROUND - 16 },
    { k: "brick", x: 56, y: GROUND - 16 },
    { k: "brick", x: 42, y: GROUND - 32 },
    { k: "coin", x: 208, y: 64, c: "pixel-world-bob" },
    { k: "coin", x: 232, y: 76, c: "pixel-world-bob" },
    { k: "brick", x: 260, y: GROUND - 16 },
    { k: "brick", x: 288, y: GROUND - 16 },
  ],

  auth: [
    { k: "cloud", x: 40, y: 24, c: "pixel-world-drift-a" },
    { k: "cloud", x: 220, y: 18, c: "pixel-world-drift-c" },
    { k: "hill", x: 150, y: GROUND - 48, wide: true },
    { k: "bush", x: 20, y: GROUND - 20 },
    { k: "flower", x: 120, y: GROUND - 16 },
  ],

  space: [
    { k: "cloud", x: 20, y: 14, c: "pixel-world-drift-a" },
    { k: "cloud", x: 140, y: 22, c: "pixel-world-drift-b" },
    { k: "cloud", x: 250, y: 10, c: "pixel-world-drift-c" },
    { k: "hill", x: -40, y: GROUND - 48, wide: true },
    { k: "hill", x: 110, y: GROUND - 48, wide: true },
    { k: "hill", x: 230, y: GROUND - 48 },
    { k: "tree", x: 170, y: GROUND - 44 },
    { k: "bush", x: 60, y: GROUND - 20 },
    { k: "flower", x: 280, y: GROUND - 16 },
    { k: "coin", x: 100, y: 90, c: "pixel-world-bob" },
  ],

  settings: [
    { k: "cloud", x: 30, y: 20, c: "pixel-world-drift-a" },
    { k: "star", x: 230, y: 40, c: "pixel-world-twinkle" },
    { k: "stone", x: 280, y: GROUND - 16 },
    { k: "stone", x: 30, y: GROUND - 16 },
  ],

  admin: [
    { k: "cloud", x: 200, y: 18, c: "pixel-world-drift-b" },
    { k: "star", x: 60, y: 36, c: "pixel-world-twinkle" },
    { k: "brick", x: 24, y: GROUND - 16 },
    { k: "brick", x: 52, y: GROUND - 16 },
    { k: "brick", x: 38, y: GROUND - 32 },
    { k: "brick", x: 260, y: GROUND - 16 },
    { k: "brick", x: 288, y: GROUND - 16 },
  ],
}

const CELL = 16

/* Kotak aksen, koordinat kelipatan CELL. Ubah sesuka hati. */
const ACCENT_CELLS: [number, number][] = [
  [3, 2], [4, 2], [9, 4], [15, 1], [17, 5], [1, 6], [12, 7],
]

function GridAccent() {
  return (
    <>
      <defs>
        <pattern id="pw-grid" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width={CELL} height="1" className="fill-soft" />
          <rect x="0" y="0" width="1" height={CELL} className="fill-soft" />
        </pattern>

        {/* papan catur 10px, tinggi pas 2 baris untuk strip lantai 20px */}
        <pattern id="pw-check" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="10" height="10" className="fill-earth" />
          <rect x="10" y="10" width="10" height="10" className="fill-earth" />
        </pattern>

        <linearGradient id="pw-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id="pw-fade-mask">
          <rect width="320" height="200" fill="url(#pw-fade)" />
        </mask>
      </defs>

      {/* grid memudar ke atas */}
      <rect width="320" height="200" fill="url(#pw-grid)" mask="url(#pw-fade-mask)" opacity="0.5" />

      {/* kotak aksen */}
      {ACCENT_CELLS.map(([cx, cy]) => (
        <rect
          key={`${cx}-${cy}`}
          x={cx * CELL + 1}
          y={cy * CELL + 1}
          width={CELL - 1}
          height={CELL - 1}
          className="fill-coin opacity-20"
        />
      ))}

      {/* lantai papan catur */}
      <rect y={GROUND} width="320" height={200 - GROUND} fill="url(#pw-check)" opacity="0.45" />
      <rect y={GROUND} width="320" height="2" className="fill-earth opacity-70" />
    </>
  )
}

const SceneArt = memo(function SceneArt({
  scene,
}: {
  scene: Exclude<PixelWorldScene, "playground">
}) {
  return (
    <svg
      className="pixel-deco absolute inset-0 h-full w-full"
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <GridAccent />
      {ART[scene].map(({ k, c, ...rest }, i) => {
        const Comp = PARTS[k]
        return <Comp key={`${k}-${i}`} className={c} {...rest} />
      })}
    </svg>
  )
})

export function PixelWorldBackdrop() {
  const pathname = usePathname() ?? "/"
  const scene = pixelWorldSceneFromPath(pathname)

  if (scene === "playground") return null

  return (
    <div
      className={cn("pixel-world", `pixel-world--${scene}`)}
      data-pixel-world={scene}
      aria-hidden="true"
    >
      <div className="pixel-world-sky" />
      <div className="pixel-world-veil" />
      <div className="pixel-world-ground" />
      <SceneArt scene={scene} />
    </div>
  )
}