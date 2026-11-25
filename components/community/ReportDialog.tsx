"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Dialog } from "@/components/ui/Dialog"
import { Textarea } from "@/components/ui/Textarea"
import { submitReportAction, type CommunityActionState } from "@/features/community/actions"
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"
import { loginHref } from "@/lib/paths"
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportTargetType } from "@/lib/site"

export function ReportButton({
  lang,
  targetType,
  targetId,
  isMember,
}: {
  lang: Lang
  targetType: ReportTargetType
  targetId: string
  isMember: boolean
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (!isMember) {
    return (
      <Link href={loginHref(lang, pathname)} className="text-[13px] text-muted underline hover:text-fg">
        {copy.report[lang]}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={socialButtonClass({ variant: "ghost", size: "sm" })}
      >
        {copy.report[lang]}
      </button>
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
    <Dialog
      open
      onClose={onClose}
      title={copy.reportTitle[lang]}
      closeLabel={copy.closeMenu[lang]}
      tone="social"
    >
      {submitted ? (
        <div className="grid gap-4">
          <Alert flat>{copy.reportThanks[lang]}</Alert>
          <button type="button" onClick={onClose} className={socialButtonClass({ variant: "solid", size: "sm" })}>
            {copy.closeMenu[lang]}
          </button>
        </div>
      ) : (
        <form action={action} className="grid gap-4">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          {state && "error" in state ? (
            <Alert tone="error" flat>
              {copy.errors[state.error][lang]}
            </Alert>
          ) : null}
          <div className="grid gap-1.5">
            <label htmlFor="report-reason" className="text-[14px] font-medium">
              {copy.reportReason[lang]}
            </label>
            <select
              id="report-reason"
              name="reason"
              required
              className="min-h-11 border border-[color:var(--soc-hairline)] bg-soft px-3 text-[15px] focus-visible:border-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky"
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
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              className={socialButtonClass({ variant: "solid", size: "sm" })}
            >
              {pending ? copy.reportSubmitting[lang] : copy.reportSubmit[lang]}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className={socialButtonClass({ variant: "ghost", size: "sm" })}
            >
              {copy.createCancel[lang]}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}
