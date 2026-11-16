"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Textarea } from "@/components/ui/Textarea"
import { submitReportAction, type CommunityActionState } from "@/features/community/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportTargetType } from "@/lib/site"

export function ReportButton({
  lang,
  targetType,
  targetId,
  member,
}: {
  lang: Lang
  targetType: ReportTargetType
  targetId: string
  member: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (!member) {
    return (
      <Link href={loginHref(lang, pathname)} className="text-[13px] text-muted underline hover:text-fg">
        {copy.report[lang]}
      </Link>
    )
  }

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {copy.report[lang]}
      </Button>
      {open ? (
        <ReportDialog
          lang={lang}
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function ReportDialog({
  lang,
  targetType,
  targetId,
  onClose,
}: {
  lang: Lang
  targetType: ReportTargetType
  targetId: string
  onClose: () => void
}) {
  const [state, action, pending] = useActionState<CommunityActionState, FormData>(
    submitReportAction,
    null,
  )
  const submitted = Boolean(state && "ok" in state)

  return (
    <Dialog open onClose={onClose} title={copy.reportTitle[lang]} closeLabel={copy.closeMenu[lang]}>
      {submitted ? (
        <div className="grid gap-4">
          <Alert>{copy.reportThanks[lang]}</Alert>
          <Button type="button" onClick={onClose}>
            {copy.closeMenu[lang]}
          </Button>
        </div>
      ) : (
      <form action={action} className="grid gap-4">
        <input type="hidden" name="target_type" value={targetType} />
        <input type="hidden" name="target_id" value={targetId} />
        {state && "error" in state ? (
          <Alert tone="error">{copy.errors[state.error][lang]}</Alert>
        ) : null}
        <div className="grid gap-1.5">
          <label htmlFor="report-reason" className="text-[14px] font-medium">
            {copy.reportReason[lang]}
          </label>
          <select
            id="report-reason"
            name="reason"
            required
            className="min-h-11 border-[3px] border-earth bg-bg px-3 text-[15px]"
            defaultValue="spam"
          >
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {copy.reportReasons[reason][lang]}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          id="report-details"
          name="details"
          maxLength={REPORT_DETAILS_MAX}
          label={copy.reportDetails[lang]}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
            {pending ? copy.reportSubmitting[lang] : copy.reportSubmit[lang]}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            {copy.createCancel[lang]}
          </Button>
        </div>
      </form>
      )}
    </Dialog>
  )
}
