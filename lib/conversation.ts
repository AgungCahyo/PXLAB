export type ConversationAuthor = {
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export type ConversationNote = {
  id: string
  user_id: string
  creation_id: string
  content: string
  status: "published" | "hidden"
  parent_id: string | null
  created_at: string
  updated_at: string | null
  author: ConversationAuthor
}

export type ConversationRoot = ConversationNote & {
  replies: ConversationNote[]
}

export function isCommentEdited(createdAt: string, updatedAt: string | null) {
  if (!updatedAt) return false
  const created = Date.parse(createdAt)
  const updated = Date.parse(updatedAt)
  if (Number.isNaN(created) || Number.isNaN(updated)) return false
  return updated - created > 1000
}

export function attachReplies(roots: ConversationNote[], replies: ConversationNote[]): ConversationRoot[] {
  const map = new Map<string, ConversationRoot>()
  for (const root of roots) {
    map.set(root.id, { ...root, parent_id: null, replies: [] })
  }
  for (const reply of replies) {
    if (!reply.parent_id) continue
    const parent = map.get(reply.parent_id)
    if (parent) parent.replies.push(reply)
  }
  return roots.map((root) => map.get(root.id)).filter((row): row is ConversationRoot => Boolean(row))
}

export function mergeConversation(
  earlier: ConversationRoot[],
  latest: ConversationRoot[],
  pending: ConversationRoot[],
): ConversationRoot[] {
  const order: ConversationRoot[] = []
  const seen = new Set<string>()

  const take = (root: ConversationRoot) => {
    const existing = order.find((item) => item.id === root.id)
    if (existing) {
      const replyIds = new Set(existing.replies.map((reply) => reply.id))
      for (const reply of root.replies) {
        if (!replyIds.has(reply.id)) existing.replies.push(reply)
      }
      return
    }
    if (seen.has(root.id)) return
    seen.add(root.id)
    order.push({ ...root, replies: [...root.replies] })
  }

  for (const root of earlier) take(root)
  for (const root of latest) take(root)
  for (const root of pending) take(root)
  return order
}
