import { SPACE_VIEWBOX } from "@/lib/site"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import type { VisualContent } from "@/lib/validations/creation"

export function VisualCanvas({
  content,
  lang,
}: {
  content: VisualContent
  lang: Lang
}) {
  return (
    <svg
      viewBox={SPACE_VIEWBOX}
      role="img"
      aria-label={copy.visualCanvasTitle[lang]}
      className="pixel-frame aspect-square w-full bg-card"
    >
      <rect x="0" y="0" width="1000" height="1000" fill="transparent" />
      {content.elements.map((element, index) => {
        if (element.type === "rect") {
          return (
            <rect
              key={`${element.type}-${index}`}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              fill={element.fill}
            />
          )
        }
        if (element.type === "circle") {
          return (
            <circle
              key={`${element.type}-${index}`}
              cx={element.x}
              cy={element.y}
              r={element.r}
              fill={element.fill}
            />
          )
        }
        return (
          <text
            key={`${element.type}-${index}`}
            x={element.x}
            y={element.y}
            fill={element.fill}
            fontSize="36"
            fontFamily="var(--font-sans), system-ui, sans-serif"
          >
            {element.body}
          </text>
        )
      })}
    </svg>
  )
}
