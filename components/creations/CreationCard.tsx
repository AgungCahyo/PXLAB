import Link from "next/link"
import { PixelArt } from "@/components/creations/PixelArt"
import { displayTitle } from "@/lib/creations"
import { creationCategoryLabels } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { pixelCoverUrl } from "@/lib/site"
import type { CreationCard as CreationCardData } from "@/features/creations/queries"

export function CreationCard({
  creation,
  lang,
  hrefPath,
}: {
  creation: CreationCardData
  lang: Lang
  hrefPath?: string
}) {
  const path = hrefPath ?? `/creation/${creation.id}`
  const cover =
    creation.type === "pixel" ? creation.cover_url || pixelCoverUrl(creation.id) : null
  const categoryLabel = creation.category
    ? creationCategoryLabels[creation.category][lang]
    : null

  return (
    <article className="pixel-frame h-full bg-card">
      <Link href={href(lang, path)} className="block h-full hover:bg-soft">
        {cover ? (
          <PixelArt src={cover} alt="" variant="thumb" framed={false} />
        ) : (
          <div className="pixel-thumb bg-soft" />
        )}
        <div className="px-3 py-3">
          <p className="truncate text-[14px]">
            <span className="text-fg">{displayTitle(creation.title, lang)}</span>
            <span className="text-muted"> · @{creation.author.username}</span>
          </p>
          {categoryLabel ? (
            <p className="mt-1 truncate text-[12px] text-muted">{categoryLabel}</p>
          ) : null}
        </div>
      </Link>
    </article>
  )
}
