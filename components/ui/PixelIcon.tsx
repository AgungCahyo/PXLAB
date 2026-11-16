import { cn } from "@/lib/utils"

const icons = {
  menu: (
    <>
      <rect x="2" y="4" width="12" height="2" />
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="10" width="12" height="2" />
    </>
  ),
  close: (
    <>
      <rect x="3" y="3" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="5" y="9" width="2" height="2" />
      <rect x="9" y="9" width="2" height="2" />
      <rect x="3" y="11" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
    </>
  ),
  grid: (
    <>
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </>
  ),
  flag: (
    <>
      <rect x="4" y="2" width="2" height="12" />
      <rect x="6" y="3" width="6" height="5" />
      <rect x="3" y="13" width="5" height="2" />
    </>
  ),
  back: (
    <>
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="5" width="2" height="6" />
      <rect x="4" y="3" width="2" height="2" />
      <rect x="4" y="11" width="2" height="2" />
      <rect x="6" y="1" width="2" height="2" />
      <rect x="6" y="13" width="2" height="2" />
    </>
  ),
  pencil: (
    <>
      <rect x="10" y="2" width="4" height="4" />
      <rect x="8" y="4" width="4" height="4" />
      <rect x="6" y="6" width="4" height="4" />
      <rect x="4" y="8" width="4" height="4" />
      <rect x="2" y="11" width="3" height="3" />
    </>
  ),
  eraser: (
    <>
      <rect x="3" y="6" width="10" height="6" />
      <rect x="5" y="4" width="6" height="2" />
      <rect x="5" y="8" width="6" height="2" fill="var(--bg)" />
    </>
  ),
  pan: (
    <>
      <rect x="7" y="2" width="2" height="12" />
      <rect x="2" y="7" width="12" height="2" />
      <rect x="5" y="4" width="2" height="2" />
      <rect x="9" y="4" width="2" height="2" />
      <rect x="5" y="10" width="2" height="2" />
      <rect x="9" y="10" width="2" height="2" />
    </>
  ),
  eyedropper: (
    <>
      <rect x="10" y="2" width="4" height="4" />
      <rect x="8" y="4" width="4" height="4" />
      <rect x="6" y="6" width="4" height="4" />
      <rect x="3" y="10" width="4" height="4" />
      <rect x="2" y="12" width="2" height="2" />
    </>
  ),
  fill: (
    <>
      <rect x="3" y="2" width="2" height="8" />
      <rect x="5" y="8" width="8" height="2" />
      <rect x="4" y="10" width="10" height="4" />
    </>
  ),
  line: (
    <>
      <rect x="2" y="12" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="6" y="8" width="2" height="2" />
      <rect x="8" y="6" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
      <rect x="12" y="2" width="2" height="2" />
    </>
  ),
  rect: (
    <>
      <rect x="3" y="3" width="10" height="2" />
      <rect x="3" y="11" width="10" height="2" />
      <rect x="3" y="5" width="2" height="6" />
      <rect x="11" y="5" width="2" height="6" />
    </>
  ),
  ellipse: (
    <>
      <rect x="5" y="2" width="6" height="2" />
      <rect x="3" y="4" width="2" height="2" />
      <rect x="11" y="4" width="2" height="2" />
      <rect x="2" y="6" width="2" height="4" />
      <rect x="12" y="6" width="2" height="4" />
      <rect x="3" y="10" width="2" height="2" />
      <rect x="11" y="10" width="2" height="2" />
      <rect x="5" y="12" width="6" height="2" />
    </>
  ),
  brush: (
    <>
      <rect x="6" y="2" width="4" height="6" />
      <rect x="5" y="8" width="6" height="2" />
      <rect x="4" y="10" width="8" height="4" />
    </>
  ),
  select: (
    <>
      <rect x="2" y="2" width="4" height="2" />
      <rect x="10" y="2" width="4" height="2" />
      <rect x="2" y="2" width="2" height="4" />
      <rect x="12" y="2" width="2" height="4" />
      <rect x="2" y="10" width="2" height="4" />
      <rect x="12" y="10" width="2" height="4" />
      <rect x="2" y="12" width="4" height="2" />
      <rect x="10" y="12" width="4" height="2" />
    </>
  ),
  flip: (
    <>
      <rect x="2" y="3" width="5" height="10" />
      <rect x="9" y="3" width="5" height="10" />
      <rect x="7" y="7" width="2" height="2" />
    </>
  ),
  rotate: (
    <>
      <rect x="4" y="2" width="8" height="2" />
      <rect x="10" y="4" width="2" height="6" />
      <rect x="4" y="8" width="6" height="2" />
      <rect x="4" y="4" width="2" height="2" />
      <rect x="2" y="11" width="4" height="2" />
    </>
  ),
  clear: (
    <>
      <rect x="3" y="3" width="10" height="10" />
      <rect x="5" y="5" width="6" height="6" fill="var(--bg)" />
      <rect x="2" y="2" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </>
  ),
  undo: (
    <>
      <rect x="3" y="7" width="10" height="2" />
      <rect x="3" y="5" width="2" height="6" />
      <rect x="5" y="3" width="2" height="2" />
      <rect x="5" y="11" width="2" height="2" />
    </>
  ),
  redo: (
    <>
      <rect x="3" y="7" width="10" height="2" />
      <rect x="11" y="5" width="2" height="6" />
      <rect x="9" y="3" width="2" height="2" />
      <rect x="9" y="11" width="2" height="2" />
    </>
  ),
  palette: (
    <>
      <rect x="3" y="3" width="4" height="4" />
      <rect x="9" y="3" width="4" height="4" />
      <rect x="3" y="9" width="4" height="4" />
      <rect x="9" y="9" width="4" height="4" />
    </>
  ),
  more: (
    <>
      <rect x="2" y="7" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="12" y="7" width="2" height="2" />
    </>
  ),
  star: (
    <>
      <rect x="7" y="1" width="2" height="2" />
      <rect x="5" y="3" width="6" height="2" />
      <rect x="1" y="5" width="14" height="2" />
      <rect x="3" y="7" width="10" height="2" />
      <rect x="5" y="9" width="6" height="2" />
      <rect x="3" y="11" width="3" height="2" />
      <rect x="10" y="11" width="3" height="2" />
      <rect x="2" y="13" width="2" height="2" />
      <rect x="12" y="13" width="2" height="2" />
    </>
  ),
  heart: (
    <>
      <rect x="3" y="3" width="4" height="2" />
      <rect x="9" y="3" width="4" height="2" />
      <rect x="2" y="5" width="12" height="3" />
      <rect x="4" y="8" width="8" height="2" />
      <rect x="6" y="10" width="4" height="2" />
      <rect x="7" y="12" width="2" height="2" />
    </>
  ),
  share: (
    <>
      <rect x="2" y="6" width="8" height="8" />
      <rect x="4" y="8" width="4" height="4" fill="var(--bg)" />
      <rect x="8" y="2" width="6" height="2" />
      <rect x="12" y="2" width="2" height="6" />
      <rect x="8" y="6" width="2" height="2" />
      <rect x="10" y="4" width="2" height="2" />
    </>
  ),
  download: (
    <>
      <rect x="7" y="2" width="2" height="7" />
      <rect x="4" y="7" width="2" height="2" />
      <rect x="10" y="7" width="2" height="2" />
      <rect x="5" y="8" width="6" height="2" />
      <rect x="3" y="11" width="10" height="2" />
      <rect x="3" y="13" width="2" height="1" />
      <rect x="11" y="13" width="2" height="1" />
    </>
  ),
  user: (
    <>
      <rect x="6" y="2" width="4" height="4" />
      <rect x="5" y="6" width="6" height="2" />
      <rect x="3" y="9" width="10" height="5" />
    </>
  ),
  folder: (
    <>
      <rect x="2" y="4" width="5" height="2" />
      <rect x="2" y="6" width="12" height="8" />
    </>
  ),
  search: (
    <>
      <rect x="3" y="3" width="8" height="8" />
      <rect x="5" y="5" width="4" height="4" fill="var(--bg)" />
      <rect x="10" y="10" width="2" height="2" />
      <rect x="12" y="12" width="2" height="2" />
    </>
  ),
} as const

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
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      className={cn("pixel-deco inline-block shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      {icons[name]}
    </svg>
  )
}
