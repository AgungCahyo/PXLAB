import { z } from "zod"
import {
  COMMENT_BODY_MAX,
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from "@/lib/site"

export const commentIdSchema = z.uuid()
export const commentBodySchema = z.string().trim().min(1).max(COMMENT_BODY_MAX)

export const addCommentSchema = z
  .object({
    creation_id: z.uuid(),
    content: commentBodySchema,
    parent_id: z.uuid().optional(),
  })
  .strict()

export const editCommentSchema = z
  .object({
    id: commentIdSchema,
    content: commentBodySchema,
  })
  .strict()

export const deleteCommentSchema = z
  .object({
    id: commentIdSchema,
  })
  .strict()

export const toggleReactionSchema = z
  .object({
    creation_id: z.uuid(),
  })
  .strict()

export const forkCreationSchema = z
  .object({
    creation_id: z.uuid(),
  })
  .strict()

export const followCreatorSchema = z
  .object({
    user_id: z.uuid(),
  })
  .strict()

export const reportReasonSchema = z.enum(REPORT_REASONS)
export const reportTargetTypeSchema = z.enum(REPORT_TARGET_TYPES)
export const reportStatusSchema = z.enum(REPORT_STATUSES)

export const submitReportSchema = z
  .object({
    target_type: reportTargetTypeSchema,
    target_id: z.uuid(),
    reason: reportReasonSchema,
    details: z.string().trim().max(REPORT_DETAILS_MAX).optional(),
  })
  .strict()

export const moderateReportSchema = z
  .object({
    id: z.uuid(),
    intent: z.enum(["review", "resolve", "hide", "restore"]),
  })
  .strict()
