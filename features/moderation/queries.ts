import { getCurrentProfile } from "@/lib/auth/session"
import { isAdminRole } from "@/lib/auth/permissions"
import { isReportStatus, type ReportReason, type ReportStatus, type ReportTargetType } from "@/lib/site"
import { createServerSupabase } from "@/lib/supabase/server"

export type AdminReport = {
  id: string
  reporter_id: string
  reporterUsername: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  created_at: string
  reviewed_at: string | null
  targetLabel: string
  targetHref: string | null
  targetHidden: boolean
}

type ProfileEmbed = { username: string }

function usernameOf(row: { profiles?: ProfileEmbed | ProfileEmbed[] | null }) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return profile?.username ?? "member"
}

async function describeTarget(
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>,
  targetType: ReportTargetType,
  targetId: string,
): Promise<{ label: string; href: string | null; hidden: boolean }> {
  if (targetType === "creation") {
    const { data } = await supabase.from("creations").select("id, title, status").eq("id", targetId).maybeSingle()
    if (!data) return { label: targetId, href: null, hidden: true }
    return {
      label: data.title as string,
      href: data.status === "published" ? `/creation/${data.id}` : `/creation/${data.id}`,
      hidden: data.status === "hidden",
    }
  }
  if (targetType === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("id, content, status, creation_id")
      .eq("id", targetId)
      .maybeSingle()
    if (!data) return { label: targetId, href: null, hidden: true }
    const snippet = String(data.content).slice(0, 80)
    return {
      label: snippet,
      href: `/creation/${data.creation_id}#comment-${data.id}`,
      hidden: data.status === "hidden",
    }
  }
  const { data } = await supabase
    .from("space_elements")
    .select("id, element_type, status")
    .eq("id", targetId)
    .maybeSingle()
  if (!data) return { label: targetId, href: "/space", hidden: true }
  return {
    label: data.element_type as string,
    href: "/space",
    hidden: data.status === "hidden",
  }
}

export async function listAdminReports(status: ReportStatus | "all"): Promise<AdminReport[]> {
  const profile = await getCurrentProfile()
  if (!profile || !isAdminRole(profile.role)) return []
  const supabase = await createServerSupabase()
  if (!supabase) return []

  let query = supabase
    .from("reports")
    .select(
      "id, reporter_id, target_type, target_id, reason, details, status, created_at, reviewed_at, profiles!reporter_id (username)",
    )
    .order("created_at", { ascending: false })
    .limit(100)

  if (status !== "all") query = query.eq("status", status)

  const { data } = await query
  if (!data) return []

  const reports: AdminReport[] = []
  for (const row of data) {
    const targetType = row.target_type as ReportTargetType
    const target = await describeTarget(supabase, targetType, row.target_id as string)
    reports.push({
      id: row.id as string,
      reporter_id: row.reporter_id as string,
      reporterUsername: usernameOf(row),
      target_type: targetType,
      target_id: row.target_id as string,
      reason: row.reason as ReportReason,
      details: (row.details as string | null) ?? null,
      status: row.status as ReportStatus,
      created_at: row.created_at as string,
      reviewed_at: (row.reviewed_at as string | null) ?? null,
      targetLabel: target.label,
      targetHref: target.href,
      targetHidden: target.hidden,
    })
  }
  return reports
}

export function parseReportFilter(value: string | undefined): ReportStatus | "all" {
  if (value === "all") return "all"
  if (value && isReportStatus(value)) return value
  return "pending"
}
