"use client"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { VisualCanvas } from "@/components/creations/VisualCanvas"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import {
  CREATION_VISUAL_MAX_ELEMENTS,
  CREATION_VISUAL_TEXT_MAX,
  SPACE_SIZE,
  VISUAL_FILLS,
} from "@/lib/site"
import type { VisualContent, VisualElement } from "@/lib/validations/creation"

function offset(index: number) {
  return Math.min(720, 80 + index * 28)
}

export function VisualEditor({
  lang,
  value,
  onChange,
}: {
  lang: Lang
  value: VisualContent
  onChange: (next: VisualContent) => void
}) {
  const add = (element: VisualElement) => {
    if (value.elements.length >= CREATION_VISUAL_MAX_ELEMENTS) return
    onChange({ version: 1, elements: [...value.elements, element] })
  }

  const update = (index: number, next: VisualElement) => {
    onChange({
      version: 1,
      elements: value.elements.map((element, i) => (i === index ? next : element)),
    })
  }

  const remove = (index: number) => {
    onChange({
      version: 1,
      elements: value.elements.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <VisualCanvas content={value} lang={lang} />
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={value.elements.length >= CREATION_VISUAL_MAX_ELEMENTS}
            onClick={() =>
              add({
                type: "rect",
                x: offset(value.elements.length),
                y: offset(value.elements.length),
                width: 220,
                height: 140,
                fill: "#9a45e0",
              })
            }
          >
            {copy.visualAddRect[lang]}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={value.elements.length >= CREATION_VISUAL_MAX_ELEMENTS}
            onClick={() =>
              add({
                type: "circle",
                x: 400 + (value.elements.length % 5) * 40,
                y: 400,
                r: 70,
                fill: "#2f6f5e",
              })
            }
          >
            {copy.visualAddCircle[lang]}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={value.elements.length >= CREATION_VISUAL_MAX_ELEMENTS}
            onClick={() =>
              add({
                type: "text",
                x: 80,
                y: 80 + value.elements.length * 40,
                body: "PXLB",
                fill: "#f4f2ef",
              })
            }
          >
            {copy.visualAddText[lang]}
          </Button>
        </div>
        {value.elements.length === 0 ? (
          <p className="text-[14px] text-muted">{copy.visualEmpty[lang]}</p>
        ) : null}
        {value.elements.map((element, index) => (
          <fieldset key={`${element.type}-${index}`} className="pixel-frame grid gap-3 bg-card p-4">
            <legend className="px-1 text-[13px] text-muted">{element.type}</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label={copy.visualX[lang]}
                value={element.x}
                onChange={(x) => update(index, { ...element, x })}
              />
              <NumberField
                label={copy.visualY[lang]}
                value={element.y}
                onChange={(y) => update(index, { ...element, y })}
              />
              {element.type === "rect" ? (
                <>
                  <NumberField
                    label={copy.visualW[lang]}
                    min={1}
                    value={element.width}
                    onChange={(width) => update(index, { ...element, width })}
                  />
                  <NumberField
                    label={copy.visualH[lang]}
                    min={1}
                    value={element.height}
                    onChange={(height) => update(index, { ...element, height })}
                  />
                </>
              ) : null}
              {element.type === "circle" ? (
                <NumberField
                  label={copy.visualR[lang]}
                  min={1}
                  max={SPACE_SIZE / 2}
                  value={element.r}
                  onChange={(r) => update(index, { ...element, r })}
                />
              ) : null}
            </div>
            {element.type === "text" ? (
              <Input
                id={`visual-text-${index}`}
                label={copy.createBodyLabel[lang]}
                maxLength={CREATION_VISUAL_TEXT_MAX}
                value={element.body}
                onChange={(event) => update(index, { ...element, body: event.target.value })}
              />
            ) : null}
            <div className="grid gap-1.5">
              <label htmlFor={`visual-fill-${index}`} className="text-[14px] font-medium">
                {copy.visualFill[lang]}
              </label>
              <select
                id={`visual-fill-${index}`}
                className="min-h-11 border-[3px] border-earth bg-bg px-3 text-[15px]"
                value={element.fill}
                onChange={(event) =>
                  update(index, { ...element, fill: event.target.value as VisualElement["fill"] })
                }
              >
                {VISUAL_FILLS.map((fill) => (
                  <option key={fill} value={fill}>
                    {fill}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
              {copy.visualRemove[lang]}
            </Button>
          </fieldset>
        ))}
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = SPACE_SIZE,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}) {
  return (
    <label className="grid gap-1.5 text-[14px] font-medium">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 border-[3px] border-earth bg-bg px-3 text-[15px] font-normal"
      />
    </label>
  )
}
