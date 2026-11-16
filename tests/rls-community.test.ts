import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  canAccessAdmin,
  canCommentOnCreation,
  canDeleteComment,
  canEditComment,
  canForkCreation,
  canReactToCreation,
  canReportTarget,
  canViewComment,
  isAdminRole,
} from "@/lib/auth/permissions"

const memberA = "11111111-1111-1111-1111-111111111111"
const memberB = "22222222-2222-2222-2222-222222222222"

describe("community authorization", () => {
  it("lets a member comment, react, and fork only published works", () => {
    expect(canCommentOnCreation({ sessionUserId: memberA, creationStatus: "published" })).toBe(true)
    expect(canCommentOnCreation({ sessionUserId: null, creationStatus: "published" })).toBe(false)
    expect(canCommentOnCreation({ sessionUserId: memberA, creationStatus: "draft" })).toBe(false)
    expect(canReactToCreation({ sessionUserId: memberA, creationStatus: "hidden" })).toBe(false)
    expect(canForkCreation({ sessionUserId: memberA, creationStatus: "published" })).toBe(true)
  })

  it("lets only the comment owner delete it", () => {
    expect(canDeleteComment(memberA, memberA)).toBe(true)
    expect(canDeleteComment(memberA, memberB)).toBe(false)
  })

  it("lets only the comment owner edit it", () => {
    expect(canEditComment(memberA, memberA)).toBe(true)
    expect(canEditComment(memberA, memberB)).toBe(false)
  })

  it("hides comments on unpublished or hidden rows from the public", () => {
    expect(
      canViewComment({
        commentStatus: "published",
        creationStatus: "published",
        isAdmin: false,
      }),
    ).toBe(true)
    expect(
      canViewComment({
        commentStatus: "hidden",
        creationStatus: "published",
        isAdmin: false,
      }),
    ).toBe(false)
    expect(
      canViewComment({
        commentStatus: "published",
        creationStatus: "hidden",
        isAdmin: false,
      }),
    ).toBe(false)
    expect(
      canViewComment({
        commentStatus: "hidden",
        creationStatus: "published",
        isAdmin: true,
      }),
    ).toBe(true)
  })

  it("rejects reports on targets that are not public", () => {
    expect(canReportTarget({ sessionUserId: memberA, targetVisible: true })).toBe(true)
    expect(canReportTarget({ sessionUserId: memberA, targetVisible: false })).toBe(false)
    expect(canReportTarget({ sessionUserId: null, targetVisible: true })).toBe(false)
  })

  it("blocks non-admin access to moderation", () => {
    expect(isAdminRole("member")).toBe(false)
    expect(isAdminRole("admin")).toBe(true)
    expect(canAccessAdmin(false)).toBe(false)
    expect(canAccessAdmin(true)).toBe(true)
  })
})

describe("community RLS migration", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../supabase/migrations/20261116050000_community.sql"),
    "utf8",
  )

  it("enables row level security on comments, reactions, and reports", () => {
    expect(sql).toMatch(/alter table public.comments enable row level security/)
    expect(sql).toMatch(/alter table public.reactions enable row level security/)
    expect(sql).toMatch(/alter table public.reports enable row level security/)
  })

  it("publishes comments only when the creation is published", () => {
    expect(sql).toMatch(/c.status = 'published'/)
    expect(sql).toMatch(/status = 'published'/)
  })

  it("enforces one appreciation per member and creation", () => {
    expect(sql).toMatch(/constraint reactions_unique_member unique \(user_id, creation_id\)/)
    expect(sql).toMatch(/reaction_type = 'appreciate'/)
  })

  it("keeps reports readable by the reporter and by admins", () => {
    expect(sql).toMatch(/using \(reporter_id = auth\.uid\(\)\)/)
    expect(sql).toMatch(/using \(public.is_admin\(\)\)/)
    expect(sql).not.toMatch(/grant insert on table public.reports to anon/)
  })

  it("hides and restores through admin functions, not member status grants", () => {
    expect(sql).toMatch(/create or replace function public.admin_set_creation_status/)
    expect(sql).toMatch(/create or replace function public.admin_set_comment_status/)
    expect(sql).toMatch(/create or replace function public.admin_set_space_element_status/)
    expect(sql).toMatch(/if not public.is_admin\(\) then/)
    expect(sql).toMatch(/grant execute on function public.admin_set_creation_status\(uuid, text\) to authenticated/)
    expect(sql).not.toMatch(/grant update \(status\) on table public.comments/)
    expect(sql).not.toMatch(/grant update \(status\) on table public.space_elements/)
  })

  it("does not grant report status updates to members", () => {
    expect(sql).not.toMatch(/grant update .* on table public.reports/)
  })
})
