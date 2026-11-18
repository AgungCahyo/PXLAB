import type { ComponentType, SVGProps } from "react"
import {
  ArrowLeft,
  Brush,
  ChartLine,
  Check,
  Circle,
  Clipboard,
  Close,
  ColorsSwatch,
  Copy,
  Download,
  DragAndDrop,
  Eraser,
  Expand,
  Eye,
  EyeOff,
  Flag,
  FlipHorizontal2,
  FlipVertical2,
  Folder,
  Frame,
  GitMerge,
  Grid2x22,
  Hand,
  Heading,
  Heart,
  ImageNew,
  Images,
  Keyboard,
  Lasso,
  Lock,
  MagicEdit,
  Menu,
  Minus,
  MoreHorizontal,
  Mug,
  Pencil,
  Pipette,
  Plus,
  Redo,
  Reload,
  Save,
  Scissors,
  Search,
  Share,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  SplineCursor,
  Square,
  SquareDashedCursor,
  Star,
  StopSolid,
  Trash,
  Undo,
  Unlock,
  Upload,
  User,
  Wand,
  ZoomIn,
  ZoomOut,
} from "pixelarticons/react"
import { cn } from "@/lib/utils"

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

/** Maps app icon names → pixelarticons (MIT, 24×24 grid). */
const icons = {
  menu: Menu,
  close: Close,
  grid: Grid2x22,
  flag: Flag,
  back: ArrowLeft,
  save: Save,
  eye: Eye,
  eyeOff: EyeOff,
  lock: Lock,
  unlock: Unlock,
  plus: Plus,
  trash: Trash,
  duplicate: Copy,
  copy: Copy,
  cut: Scissors,
  paste: Clipboard,
  apply: Check,
  grip: DragAndDrop,
  merge: GitMerge,
  layers: Images,
  image: ImageNew,
  publish: Upload,
  pencil: Pencil,
  eraser: Eraser,
  pan: Hand,
  eyedropper: Pipette,
  fill: Mug,
  line: ChartLine,
  rect: Square,
  ellipse: Circle,
  brush: Brush,
  /** Shape mode: outline / stroke */
  shapeStroke: Square,
  /** Shape mode: filled / fill */
  shapeFill: StopSolid,
  select: SquareDashedCursor,
  square: Square,
  circle: Circle,
  polygon: Shapes,
  bezier: SplineCursor,
  text: Heading,
  gradient: Sparkles,
  wand: Wand,
  colorSelect: ColorsSwatch,
  lasso: Lasso,
  flip: FlipHorizontal2,
  flipV: FlipVertical2,
  rotate: Reload,
  clear: Close,
  undo: Undo,
  redo: Redo,
  palette: ColorsSwatch,
  keyboard: Keyboard,
  more: MoreHorizontal,
  star: Star,
  heart: Heart,
  share: Share,
  download: Download,
  user: User,
  folder: Folder,
  search: Search,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  minus: Minus,
  fit: Expand,
  frame: Frame,
  edit: MagicEdit,
  sliders: SlidersHorizontal,
} as const satisfies Record<string, IconComponent>

export type PixelIconName = keyof typeof icons

export function PixelIcon({
  name,
  className,
  title,
}: {
  name: PixelIconName
  className?: string
  title?: string
}) {
  const Icon = icons[name]
  return (
    <Icon
      width={16}
      height={16}
      className={cn("pixel-deco inline-block shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    />
  )
}
