"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { DeleteCreationCopy } from "@/components/creations/DeleteCreationCopy"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { deleteCreationAction } from "@/features/creations/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

function DeleteSubmit({ lang }: { lang: Lang }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" disabled={pending} aria-busy={pending || undefined}>
      {pending ? copy.createDeleting[lang] : copy.createDelete[lang]}
    </Button>
  )
}

export function WorksDeleteButton({
  lang,
  creationId,
  title,
  published = false,
  onDeleted,
}: {
  lang: Lang
  creationId: string
  title: string
  published?: boolean
  /** Hide the row immediately after confirm (redirect refreshes list). */
  onDeleted?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {copy.createDelete[lang]}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.createDelete[lang]}
        closeLabel={copy.closeMenu[lang]}
      >
        <DeleteCreationCopy lang={lang} title={title} published={published} />
        <div className="mt-4 flex flex-wrap gap-3">
          <form
            action={deleteCreationAction}
            onSubmit={() => {
              onDeleted?.()
              setOpen(false)
            }}
          >
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={creationId} />
            <DeleteSubmit lang={lang} />
          </form>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
