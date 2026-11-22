import { describe, expect, it } from "vitest"
import {
  addCommentSchema,
  desiredFromForm,
  editCommentSchema,
  followCreatorSchema,
  submitReportSchema,
  toggleReactionSchema,
} from "@/lib/validations/community"

const creationId = "11111111-1111-4111-8111-111111111111"

describe("addCommentSchema", () => {
  it("accepts a trimmed comment", () => {
    const result = addCommentSchema.safeParse({
      creation_id: creationId,
      content: "  Terima kasih.  ",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toBe("Terima kasih.")
  })

  it("rejects an empty comment", () => {
    expect(addCommentSchema.safeParse({ creation_id: creationId, content: "   " }).success).toBe(
      false,
    )
  })

  it("rejects extra keys", () => {
    expect(
      addCommentSchema.safeParse({
        creation_id: creationId,
        content: "hello",
        status: "hidden",
      }).success,
    ).toBe(false)
  })

  it("accepts an optional parent id for a one-level reply", () => {
    const parentId = "22222222-2222-4222-8222-222222222222"
    const result = addCommentSchema.safeParse({
      creation_id: creationId,
      content: "Setuju.",
      parent_id: parentId,
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.parent_id).toBe(parentId)
  })

  it("rejects a malformed parent id", () => {
    expect(
      addCommentSchema.safeParse({
        creation_id: creationId,
        content: "Setuju.",
        parent_id: "not-a-uuid",
      }).success,
    ).toBe(false)
  })
})

describe("editCommentSchema", () => {
  it("accepts trimmed content for an existing comment", () => {
    const result = editCommentSchema.safeParse({
      id: creationId,
      content: "  Diedit.  ",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.content).toBe("Diedit.")
  })

  it("rejects empty content", () => {
    expect(editCommentSchema.safeParse({ id: creationId, content: "  " }).success).toBe(false)
  })
})

describe("submitReportSchema", () => {
  it("accepts an allowlisted reason", () => {
    const result = submitReportSchema.safeParse({
      target_type: "creation",
      target_id: creationId,
      reason: "spam",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.details).toBeUndefined()
  })

  it("rejects an unknown reason", () => {
    expect(
      submitReportSchema.safeParse({
        target_type: "creation",
        target_id: creationId,
        reason: "dislike",
      }).success,
    ).toBe(false)
  })

  it("rejects an unknown target type", () => {
    expect(
      submitReportSchema.safeParse({
        target_type: "profile",
        target_id: creationId,
        reason: "spam",
      }).success,
    ).toBe(false)
  })
})

describe("toggleReactionSchema", () => {
  it("accepts an explicit desired state alongside the creation id", () => {
    expect(toggleReactionSchema.safeParse({ creation_id: creationId }).success).toBe(true)
    expect(toggleReactionSchema.safeParse({ creation_id: creationId, desired: "true" }).success).toBe(
      true,
    )
    expect(toggleReactionSchema.safeParse({ creation_id: creationId, desired: "false" }).success).toBe(
      true,
    )
    expect(
      toggleReactionSchema.safeParse({ creation_id: creationId, reaction_type: "love" }).success,
    ).toBe(false)
    expect(toggleReactionSchema.safeParse({ creation_id: creationId, desired: "yes" }).success).toBe(
      false,
    )
    expect(toggleReactionSchema.safeParse({ creation_id: creationId, desired: true }).success).toBe(
      false,
    )
  })
})

describe("desiredFromForm", () => {
  it("keeps form strings so the schema does not reject a follow or like", () => {
    const form = new FormData()
    form.set("desired", "true")
    expect(desiredFromForm(form)).toBe("true")
    form.set("desired", "false")
    expect(desiredFromForm(form)).toBe("false")
    expect(desiredFromForm(new FormData())).toBeUndefined()
    const parsed = followCreatorSchema.safeParse({
      user_id: creationId,
      desired: desiredFromForm(form),
    })
    expect(parsed.success).toBe(true)
  })
})
