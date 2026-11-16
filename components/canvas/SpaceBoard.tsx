"use client"

import { usePathname, useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import type { AuthErrorCode } from "@/lib/auth/errors"
import {
  addSpaceElementAction,
  deleteSpaceElementAction,
  moveSpaceElementAction,
} from "@/features/space/actions"
import type { SpaceElementRow } from "@/features/space/queries"
import { ReportButton } from "@/components/community/ReportDialog"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { EmptyState } from "@/components/ui/EmptyState"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { loginHref, registerHref } from "@/lib/paths"
import {
  SPACE_FONT_SIZES,
  SPACE_SIZE,
  SPACE_TEXT_MAX,
  SPACE_VIEWBOX,
  VISUAL_FILLS,
  type VisualFill,
} from "@/lib/site"
import {
  defaultCirclePlacement,
  defaultRectPlacement,
} from "@/lib/validations/space"
import { PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

type Tool = "select" | "text" | "rectangle" | "circle"

function svgPoint(svg: SVGSVGElement, event: { clientX: number; clientY: number }) {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const mapped = point.matrixTransform(ctm.inverse())
  return { x: mapped.x, y: mapped.y }
}

export function SpaceBoard({
  lang,
  elements,
  member,
}: {
  lang: Lang
  elements: SpaceElementRow[]
  member: { id: string; username: string } | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>(member ? "select" : "select")
  const [fill, setFill] = useState<VisualFill>("#9a45e0")
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [textBody, setTextBody] = useState("")
  const [fontSize, setFontSize] = useState<(typeof SPACE_FONT_SIZES)[number]>(24)
  const [overlay, setOverlay] = useState<Record<string, { x: number; y: number }>>({})
  const overlayRef = useRef(overlay)
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const [pending, startTransition] = useTransition()
  const local = elements.map((item) =>
    overlay[item.id] ? { ...item, position_x: overlay[item.id].x, position_y: overlay[item.id].y } : item,
  )

  const selected = local.find((item) => item.id === selectedId) ?? null
  const ownSelected = selected && member && selected.user_id === member.id ? selected : null

  const refresh = () => {
    startTransition(() => {
      router.refresh()
    })
  }

  const run = async (work: () => Promise<{ error?: string } | { ok: true } | null>) => {
    setError(null)
    const result = await work()
    if (result && "error" in result && result.error) {
      setError(copy.errors[result.error as AuthErrorCode][lang])
      return
    }
    refresh()
  }

  const onCanvasPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!member || !svgRef.current) return
    if (tool === "select") return
    if (event.target !== svgRef.current && (event.target as Element).getAttribute("data-bg") !== "true") {
      return
    }
    const point = svgPoint(svgRef.current, event)
    if (tool === "text") {
      setPendingText({ x: point.x, y: point.y })
      setTextBody("")
      return
    }
    const payload = tool === "rectangle" ? defaultRectPlacement(point.x, point.y, fill) : defaultCirclePlacement(point.x, point.y, fill)
    const form = new FormData()
    form.set("element_type", payload.element_type)
    form.set("position_x", String(payload.position_x))
    form.set("position_y", String(payload.position_y))
    form.set("width", String(payload.width))
    if ("height" in payload && payload.height != null) form.set("height", String(payload.height))
    form.set("content", JSON.stringify(payload.content))
    void run(() => addSpaceElementAction(null, form))
  }

  const onElementPointerDown = (event: React.PointerEvent, element: SpaceElementRow) => {
    event.stopPropagation()
    setSelectedId(element.id)
    if (!member || element.user_id !== member.id || !svgRef.current) return
    const point = svgPoint(svgRef.current, event)
    drag.current = { id: element.id, dx: point.x - element.position_x, dy: point.y - element.position_y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return
    const point = svgPoint(svgRef.current, event)
    const x = Math.min(SPACE_SIZE, Math.max(0, point.x - drag.current.dx))
    const y = Math.min(SPACE_SIZE, Math.max(0, point.y - drag.current.dy))
    const id = drag.current.id
    const next = { ...overlayRef.current, [id]: { x, y } }
    overlayRef.current = next
    setOverlay(next)
  }

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const id = drag.current.id
    const moved = overlayRef.current[id]
    drag.current = null
    if (!moved) return
    const form = new FormData()
    form.set("id", id)
    form.set("position_x", String(moved.x))
    form.set("position_y", String(moved.y))
    void run(() => moveSpaceElementAction(null, form))
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const placeText = () => {
    if (!pendingText) return
    const form = new FormData()
    form.set("element_type", "text")
    form.set("position_x", String(Math.min(SPACE_SIZE, Math.max(0, pendingText.x))))
    form.set("position_y", String(Math.min(SPACE_SIZE, Math.max(0, pendingText.y))))
    form.set("content", JSON.stringify({ version: 1, body: textBody, fill, fontSize }))
    setPendingText(null)
    void run(() => addSpaceElementAction(null, form))
  }

  const contributors = [...new Map(local.map((item) => [item.author.username, item.author])).values()]

  return (
    <div className="grid gap-8">
      {member ? (
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["select", copy.spaceSelect[lang]],
              ["text", copy.spaceAddText[lang]],
              ["rectangle", copy.spaceAddRect[lang]],
              ["circle", copy.spaceAddCircle[lang]],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={tool === value ? "primary" : "outline"}
              aria-pressed={tool === value}
              onClick={() => setTool(value)}
            >
              {label}
            </Button>
          ))}
          <select
            aria-label={copy.visualFill[lang]}
            className="min-h-9 border-[3px] border-earth bg-bg px-3 text-[13px]"
            value={fill}
            onChange={(event) => setFill(event.target.value as VisualFill)}
          >
            {VISUAL_FILLS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          {ownSelected ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const form = new FormData()
                form.set("id", ownSelected.id)
                void run(() => deleteSpaceElementAction(form))
                setSelectedId(null)
              }}
            >
              {copy.spaceDelete[lang]}
            </Button>
          ) : null}
          {selected ? (
            <ReportButton lang={lang} targetType="space_element" targetId={selected.id} member />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[14px] text-muted">
            {copy.spaceSignIn[lang]}{" "}
            <Link href={loginHref(lang, pathname)} className="underline">
              {copy.nav.signIn[lang]}
            </Link>
          </p>
          {selected ? (
            <ReportButton lang={lang} targetType="space_element" targetId={selected.id} member={false} />
          ) : null}
        </div>
      )}
      {member ? <p className="text-[13px] text-muted">{copy.spacePlaceHint[lang]}</p> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <figure>
        <svg
          ref={svgRef}
          viewBox={SPACE_VIEWBOX}
          role="img"
          aria-labelledby="space-canvas-title space-canvas-desc"
          className={cn(
            "pixel-frame h-auto w-full touch-none bg-card",
            member && tool !== "select" ? "cursor-crosshair" : "",
          )}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <title id="space-canvas-title">{copy.spaceCanvasTitle[lang]}</title>
          <desc id="space-canvas-desc">{copy.spaceCanvasDesc[lang]}</desc>
          <rect data-bg="true" width={SPACE_SIZE} height={SPACE_SIZE} className="fill-card" />
          {local.map((element) => (
            <g
              key={element.id}
              onPointerDown={(event) => onElementPointerDown(event, element)}
              className={member && element.user_id === member.id ? "cursor-grab" : undefined}
            >
              <title>
                {`@${element.author.username}${
                  member && element.user_id === member.id ? ` · ${copy.spaceYours[lang]}` : ""
                }`}
              </title>
              {selectedId === element.id ? (
                <rect
                  {...selectionBounds(element)}
                  fill="none"
                  stroke="var(--brick)"
                  strokeWidth={4}
                  strokeDasharray="8 4"
                  pointerEvents="none"
                />
              ) : null}
              <SpaceShape element={element} />
            </g>
          ))}
        </svg>
        <figcaption className="mt-3 text-[13px] text-muted">{copy.spaceCaption[lang]}</figcaption>
      </figure>

      {local.length === 0 ? (
        <EmptyState
          icon={<PenLine className="h-6 w-6" />}
          title={copy.spaceEmptyTitle[lang]}
          description={copy.spaceEmptyBody[lang]}
          action={
            member ? undefined : (
              <Link href={registerHref(lang, pathname)} className={buttonClassName()}>
                {copy.landingJoin[lang]}
              </Link>
            )
          }
        />
      ) : (
        <div>
          <h2 className="text-[12px] tracking-[0.16em] text-muted uppercase">{copy.spaceContributors[lang]}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-[14px] text-muted">
            {contributors.map((person) => (
              <li key={person.username}>
                <Link href={href(lang, `/u/${person.username}`)} className="hover:text-fg">
                  @{person.username}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingText ? (
      <Dialog
        open
        onClose={() => setPendingText(null)}
        title={copy.spaceAddText[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <div className="grid gap-4">
          <Input
            id="space-text"
            label={copy.spaceTextBody[lang]}
            value={textBody}
            maxLength={SPACE_TEXT_MAX}
            onChange={(event) => setTextBody(event.target.value)}
          />
          <div className="grid gap-1.5">
            <label htmlFor="space-font" className="text-[14px] font-medium">
              {copy.spaceFontSize[lang]}
            </label>
            <select
              id="space-font"
              className="min-h-11 border-[3px] border-earth bg-bg px-3"
              value={fontSize}
              onChange={(event) =>
                setFontSize(Number(event.target.value) as (typeof SPACE_FONT_SIZES)[number])
              }
            >
              {SPACE_FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={placeText} disabled={!textBody.trim()}>
              {copy.spacePlace[lang]}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPendingText(null)}>
              {copy.createCancel[lang]}
            </Button>
          </div>
        </div>
      </Dialog>
      ) : null}
    </div>
  )
}

function selectionBounds(element: SpaceElementRow) {
  const pad = 8
  const { content, position_x: x, position_y: y, width, height } = element
  if (element.element_type === "text" && "body" in content) {
    const font = content.fontSize
    const w = Math.max(font, content.body.length * font * 0.6)
    return { x: x - pad, y: y - pad, width: w + pad * 2, height: font + pad * 2 }
  }
  if ("shape" in content && content.shape === "circle" && width) {
    return {
      x: x - width / 2 - pad,
      y: y - width / 2 - pad,
      width: width + pad * 2,
      height: width + pad * 2,
    }
  }
  if (width && height) {
    return { x: x - pad, y: y - pad, width: width + pad * 2, height: height + pad * 2 }
  }
  return { x: x - pad, y: y - pad, width: 32, height: 32 }
}

function SpaceShape({ element }: { element: SpaceElementRow }) {
  const { content, position_x: x, position_y: y, width, height } = element
  if (element.element_type === "text" && "body" in content) {
    return (
      <text
        x={x}
        y={y}
        fill={content.fill}
        fontSize={content.fontSize}
        fontFamily="var(--font-sans), system-ui, sans-serif"
        dominantBaseline="hanging"
      >
        {content.body}
      </text>
    )
  }
  if ("shape" in content && content.shape === "circle" && width) {
    return <circle cx={x} cy={y} r={width / 2} fill={content.fill} />
  }
  if ("shape" in content && content.shape === "rectangle" && width && height) {
    return <rect x={x} y={y} width={width} height={height} fill={content.fill} />
  }
  return null
}
