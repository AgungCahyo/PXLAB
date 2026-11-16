import { ViewTransition } from "react"
import { PixelArt } from "@/components/creations/PixelArt"
import { VisualCanvas } from "@/components/creations/VisualCanvas"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationType } from "@/lib/site"
import type { CreationContent } from "@/lib/validations/creation"

export function CreationBody({
  type,
  content,
  lang,
  coverUrl,
  creationId,
  priority = false,
}: {
  type: CreationType
  content: CreationContent
  lang: Lang
  coverUrl?: string | null
  /** Shared view-transition name with gallery thumbs. */
  creationId?: string
  priority?: boolean
}) {
  if (type === "pixel") {
    if (!coverUrl) return <p className="text-[15px] text-muted">—</p>
    const art = (
      <PixelArt
        src={coverUrl}
        alt={copy.pixelPreviewAlt[lang]}
        variant="stage"
        priority={priority}
      />
    )
    if (!creationId) return art
    return (
      <ViewTransition name={`creation-art-${creationId}`} share="morph" default="none">
        {art}
      </ViewTransition>
    )
  }

  if (type === "visual" && "elements" in content) {
    return content.elements.length ? (
      <VisualCanvas content={content} lang={lang} />
    ) : (
      <p className="text-[15px] text-muted">—</p>
    )
  }

  if (type === "idea" && "context" in content) {
    return (
      <div className="grid gap-6">
        <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{content.body}</p>
        {content.context.trim() ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-muted">{content.context}</p>
        ) : null}
      </div>
    )
  }

  if (type === "story" && "continuation_prompt" in content) {
    return (
      <div className="grid gap-6">
        <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{content.body}</p>
        {content.continuation_prompt.trim() ? (
          <p className="border-t border-line pt-4 text-[15px] leading-relaxed text-muted">
            {content.continuation_prompt}
          </p>
        ) : null}
      </div>
    )
  }

  if ("body" in content) {
    return <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{content.body}</p>
  }

  return null
}
