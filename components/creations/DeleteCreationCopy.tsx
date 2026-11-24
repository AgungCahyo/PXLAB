import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"

export function deleteConfirmMessage(lang: Lang, title: string) {
  return copy.createDeleteConfirmTitle[lang].replaceAll("{title}", title)
}

/** Shared delete-dialog body: names the work; warns when published. */
export function DeleteCreationCopy({
  lang,
  title,
  published,
}: {
  lang: Lang
  title: string
  published?: boolean
}) {
  return (
    <div className="grid gap-2 text-[15px] text-muted">
      <p>{deleteConfirmMessage(lang, title)}</p>
      {published ? (
        <>
          <p>{copy.createDeleteConfirmPublished[lang]}</p>
          <p>{copy.createDeleteUnpublishHint[lang]}</p>
        </>
      ) : null}
    </div>
  )
}
