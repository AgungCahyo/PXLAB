"use server"

import {
  listPublishedCreationsByUser,
  listPublishedRemixes,
  listSimilarCreations,
  type CreationCard,
} from "@/features/creations/queries"
import type { CreationCategory } from "@/lib/site"

export async function loadCreatorOtherWorksAction(args: {
  userId: string
  excludeId: string
  limit?: number
}): Promise<{ items: CreationCard[]; failed: boolean }> {
  return listPublishedCreationsByUser(args.userId, {
    excludeId: args.excludeId,
    limit: args.limit ?? 6,
    type: "pixel",
  })
}

export async function loadSimilarCreationsAction(args: {
  id: string
  category: CreationCategory | null
  tags: string[]
  limit?: number
}): Promise<{ items: CreationCard[]; failed: boolean }> {
  return listSimilarCreations({
    id: args.id,
    category: args.category,
    tags: args.tags,
    limit: args.limit ?? 6,
  })
}

export async function loadRemixStripAction(args: {
  parentId: string
  limit?: number
}): Promise<{ items: CreationCard[]; total: number; failed: boolean }> {
  return listPublishedRemixes(args.parentId, args.limit ?? 6)
}
