export function canEditProfile(sessionUserId: string, profileId: string) {
  return sessionUserId === profileId
}

export function canMutateCreation(sessionUserId: string, ownerId: string) {
  return sessionUserId === ownerId
}

export function canMutateSpaceElement(sessionUserId: string, ownerId: string) {
  return sessionUserId === ownerId
}

export function canViewSpaceElement(args: {
  sessionUserId: string | null
  ownerId: string
  status: "active" | "hidden"
  isAdmin: boolean
}) {
  if (args.status === "active") return true
  if (args.isAdmin) return true
  if (args.sessionUserId && args.sessionUserId === args.ownerId) return true
  return false
}

export function canViewCreation(args: {
  sessionUserId: string | null
  ownerId: string
  status: "draft" | "published" | "hidden"
  isAdmin: boolean
}) {
  if (args.status === "published") return true
  if (args.isAdmin) return true
  if (args.sessionUserId && args.sessionUserId === args.ownerId) return true
  return false
}

export function isAdminRole(role: string | null | undefined) {
  return role === "admin"
}

export function canAccessAdmin(isAdmin: boolean) {
  return isAdmin
}

export function canDeleteComment(sessionUserId: string, ownerId: string) {
  return sessionUserId === ownerId
}

export function canEditComment(sessionUserId: string, ownerId: string) {
  return sessionUserId === ownerId
}

export function canViewComment(args: {
  commentStatus: "published" | "hidden"
  creationStatus: "draft" | "published" | "hidden"
  isAdmin: boolean
}) {
  if (args.isAdmin) return true
  return args.commentStatus === "published" && args.creationStatus === "published"
}

export function canReactToCreation(args: {
  sessionUserId: string | null
  creationStatus: "draft" | "published" | "hidden"
}) {
  return Boolean(args.sessionUserId) && args.creationStatus === "published"
}

export function canCommentOnCreation(args: {
  sessionUserId: string | null
  creationStatus: "draft" | "published" | "hidden"
}) {
  return Boolean(args.sessionUserId) && args.creationStatus === "published"
}

export function canReportTarget(args: {
  sessionUserId: string | null
  targetVisible: boolean
}) {
  return Boolean(args.sessionUserId) && args.targetVisible
}

export function canForkCreation(args: {
  sessionUserId: string | null
  creationStatus: "draft" | "published" | "hidden"
}) {
  return Boolean(args.sessionUserId) && args.creationStatus === "published"
}

/** Official PNG download (THE COMMONS facility). Independent of fork and of display/cover access. */
export function canDownloadCreationPng(args: {
  viewerId: string | null
  ownerId: string
  status: "draft" | "published" | "hidden"
  allowPngDownload: boolean
}) {
  if (args.viewerId && args.viewerId === args.ownerId) return true
  return args.status === "published" && args.allowPngDownload
}
