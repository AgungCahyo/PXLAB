import { describe, expect, it } from "vitest"
import { attachReplies, isCommentEdited, mergeConversation, type ConversationNote } from "@/lib/conversation"

const creationId = "11111111-1111-4111-8111-111111111111"

function note(id: string, extra: Partial<ConversationNote> = {}): ConversationNote {
  return {
    id,
    user_id: "user-a",
    creation_id: creationId,
    content: id,
    status: "published",
    parent_id: null,
    created_at: "2026-11-16T10:00:00.000Z",
    updated_at: "2026-11-16T10:00:00.000Z",
    author: { username: "maple", displayName: null },
    ...extra,
  }
}

describe("attachReplies", () => {
  it("nests one-level replies under their root in given order", () => {
    const roots = [note("root-a"), note("root-b")]
    const replies = [
      note("r1", { parent_id: "root-a" }),
      note("r2", { parent_id: "root-b" }),
      note("r3", { parent_id: "root-a" }),
      note("orphan", { parent_id: "missing" }),
    ]
    const attached = attachReplies(roots, replies)
    expect(attached.map((item) => item.id)).toEqual(["root-a", "root-b"])
    expect(attached[0]?.replies.map((item) => item.id)).toEqual(["r1", "r3"])
    expect(attached[1]?.replies.map((item) => item.id)).toEqual(["r2"])
  })
})

describe("isCommentEdited", () => {
  it("treats equal timestamps as original", () => {
    expect(isCommentEdited("2026-11-16T10:00:00.000Z", "2026-11-16T10:00:00.000Z")).toBe(false)
    expect(isCommentEdited("2026-11-16T10:00:00.000Z", null)).toBe(false)
  })

  it("flags an update more than a second later", () => {
    expect(isCommentEdited("2026-11-16T10:00:00.000Z", "2026-11-16T10:00:02.000Z")).toBe(true)
  })
})

describe("mergeConversation", () => {
  it("prepends earlier roots and appends pending without duplicating ids", () => {
    const earlier = [attachReplies([note("old")], [])[0]!]
    const latest = [attachReplies([note("old"), note("new")], [note("r1", { parent_id: "new" })])[1]!]
    const pending = [
      attachReplies([note("new"), note("mine")], [note("r2", { parent_id: "new" })])[0]!,
      attachReplies([note("mine")], [])[0]!,
    ]
    const merged = mergeConversation(earlier, latest, pending)
    expect(merged.map((item) => item.id)).toEqual(["old", "new", "mine"])
    expect(merged[1]?.replies.map((item) => item.id)).toEqual(["r1", "r2"])
  })
})
