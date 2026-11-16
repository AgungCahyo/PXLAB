"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { deleteCreationAction } from "@/features/creations/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

export function WorksDeleteButton({
  lang,
  creationId,
}: {
  lang: Lang
  creationId: string
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
        <p className="text-[15px] text-muted">{copy.createDeleteConfirm[lang]}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={deleteCreationAction}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="id" value={creationId} />
            <Button type="submit" variant="primary">
              {copy.createDelete[lang]}
            </Button>
          </form>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
