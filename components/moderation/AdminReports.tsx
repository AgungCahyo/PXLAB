"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Alert } from "@/components/ui/Alert"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { EmptyState } from "@/components/ui/EmptyState"
import { FilterChip } from "@/components/ui/FilterChip"
import { moderateReportAction, type ModerationActionState } from "@/features/moderation/actions"
import type { AdminReport } from "@/features/moderation/queries"
import { copy } from "@/lib/copy"
import { formatDayMonthYear } from "@/lib/format"
import { href, type Lang } from "@/lib/i18n"
import type { ReportStatus } from "@/lib/site"
import { PixelIcon } from "@/components/ui/PixelIcon"

const FILTERS = [
  { id: "pending" as const, label: copy.adminPending },
  { id: "reviewed" as const, label: copy.adminReviewed },
  { id: "resolved" as const, label: copy.adminResolved },
  { id: "all" as const, label: copy.adminAll },
]

export function AdminReports({
  lang,
  reports,
  filter,
}: {
  lang: Lang
  reports: AdminReport[]
  filter: ReportStatus | "all"
}) {
  return (
    <div className="grid gap-8">
      <nav className="flex flex-wrap gap-2" aria-label={copy.adminFilter[lang]}>
        {FILTERS.map((item) => (
          <FilterChip
            key={item.id}
            size="sm"
            href={`${href(lang, "/admin")}${item.id === "pending" ? "" : `?status=${item.id}`}`}
            selected={filter === item.id}
          >
            {item.label[lang]}
          </FilterChip>
        ))}
      </nav>
      {reports.length === 0 ? (
        <EmptyState
          icon={<PixelIcon name="flag" className="h-6 w-6" />}
          title={copy.adminEmpty[lang]}
          description={copy.adminIntro[lang]}
        />
      ) : (
        <ul className="grid gap-4">
          {reports.map((report) => (
            <li key={report.id}>
              <ReportCard lang={lang} report={report} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportCard({ lang, report }: { lang: Lang; report: AdminReport }) {
  const [state, action, pending] = useActionState<ModerationActionState, FormData>(
    moderateReportAction,
    null,
  )
  const targetHref = report.targetHref ? href(lang, report.targetHref) : null

  return (
    <Card>
      <p className="text-[12px] tracking-[0.16em] text-muted uppercase">
        {copy.adminTargetTypes[report.target_type][lang]} · {copy.reportReasons[report.reason][lang]} ·{" "}
        {report.status}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed">
        {copy.adminTarget[lang]}:{" "}
        {targetHref ? (
          <Link href={targetHref} className="underline hover:text-fg">
            {report.targetLabel}
          </Link>
        ) : (
          report.targetLabel
        )}
      </p>
      {report.details ? <p className="mt-2 text-[14px] text-muted">{report.details}</p> : null}
      <p className="mt-3 text-[13px] text-muted">
        {copy.adminReporter[lang]} @{report.reporterUsername} · {formatDayMonthYear(report.created_at, lang)}
        {report.targetHidden ? ` · ${copy.adminHidden[lang]}` : ""}
      </p>
      {state && "error" in state ? (
        <Alert tone="error" className="mt-4">
          {copy.errors[state.error][lang]}
        </Alert>
      ) : null}
      <form action={action} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="id" value={report.id} />
        {!report.targetHidden ? (
          <Button type="submit" name="intent" value="hide" size="sm" disabled={pending} aria-busy={pending || undefined}>
            {pending ? copy.adminWorking[lang] : copy.adminHide[lang]}
          </Button>
        ) : (
          <Button
            type="submit"
            name="intent"
            value="restore"
            size="sm"
            variant="secondary"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? copy.adminWorking[lang] : copy.adminRestore[lang]}
          </Button>
        )}
        {report.status === "pending" ? (
          <Button
            type="submit"
            name="intent"
            value="review"
            size="sm"
            variant="secondary"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? copy.adminWorking[lang] : copy.adminReview[lang]}
          </Button>
        ) : null}
        {report.status !== "resolved" ? (
          <Button
            type="submit"
            name="intent"
            value="resolve"
            size="sm"
            variant="ghost"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? copy.adminWorking[lang] : copy.adminResolve[lang]}
          </Button>
        ) : null}
      </form>
    </Card>
  )
}
