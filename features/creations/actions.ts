"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { AuthErrorCode } from "@/lib/auth/errors"
import { canForkCreation, canMutateCreation } from "@/lib/auth/permissions"
import { getCurrentProfile, getSessionUserId } from "@/lib/auth/session"
import { isUnnamedTitle } from "@/lib/creations"
import { href, isLang, type Lang } from "@/lib/i18n"
import {
  PIXEL_SIZE_PRESETS,
  colorUsageFromSource,
  isPixelCanvasSize,
  isPngBuffer,
  parsePixelSource,
  pixelSizeCategory,
} from "@/lib/pixel"
import {
  CREATION_PER_MEMBER_MAX,
  PIXEL_BUCKET,
  PIXEL_PNG_MAX_BYTES,
  PIXEL_SOURCE_MAX_BYTES,
  isCreationType,
  isLegacyCreationType,
  pixelCoverUrl,
  pixelObjectPath,
  type LegacyCreationType,
} from "@/lib/site"
import { createServerSupabase } from "@/lib/supabase/server"
import { forkCreationSchema } from "@/lib/validations/community"
import {
  createDraftSchema,
  emptyCreationContent,
  parseCreationContent,
  pixelContentSchema,
  updateAllowPngDownloadSchema,
  updateCreationSchema,
  type CreationContent,
  type PixelContent,
} from "@/lib/validations/creation"
import {
  countOwnCreations,
  getOwnedCreation,
  getPublishedCreation,
  type CreationRow,
} from "@/features/creations/queries"

export type CreationActionState =
  | { error: AuthErrorCode }
  | { ok: true; published: boolean; unpublished?: boolean }
  | null

function langOf(value: FormDataEntryValue | null): Lang {
  return isLang(String(value ?? "")) ? (value as Lang) : "id"
}

function revalidateCreation(lang: Lang, id: string, username?: string) {
  revalidatePath(href(lang, "/explore"))
  revalidatePath(href(lang, "/create"))
  revalidatePath(href(lang, "/dashboard"))
  revalidatePath(href(lang, `/create/${id}`))
  revalidatePath(href(lang, `/creation/${id}`))
  if (username) revalidatePath(href(lang, `/u/${username}`))
}

function contentFromForm(type: LegacyCreationType, formData: FormData): unknown {
  if (type === "visual") {
    const raw = formData.get("content")
    if (typeof raw !== "string") return null
    try {
      return JSON.parse(raw) as unknown
    } catch {
      return null
    }
  }
  if (type === "text") {
    return { version: 1, body: String(formData.get("body") ?? "") }
  }
  if (type === "idea") {
    return {
      version: 1,
      body: String(formData.get("body") ?? ""),
      context: String(formData.get("context") ?? ""),
    }
  }
  return {
    version: 1,
    body: String(formData.get("body") ?? ""),
    continuation_prompt: String(formData.get("continuation_prompt") ?? ""),
  }
}

async function removePixelObjects(userId: string, creationId: string) {
  const supabase = await createServerSupabase()
  if (!supabase) return
  await supabase.storage.from(PIXEL_BUCKET).remove([
    pixelObjectPath(userId, creationId, "source.json"),
    pixelObjectPath(userId, creationId, "cover.png"),
  ])
}

function bytesToBlob(bytes: Uint8Array, type: string) {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return new Blob([copy], { type })
}

async function persistPixelFiles(args: {
  userId: string
  creationId: string
  sourceBytes: Uint8Array
  coverBytes: Uint8Array
}) {
  const supabase = await createServerSupabase()
  if (!supabase) return { ok: false as const, error: "not_configured" as const }

  const sourcePath = pixelObjectPath(args.userId, args.creationId, "source.json")
  const coverPath = pixelObjectPath(args.userId, args.creationId, "cover.png")

  const sourceUpload = await supabase.storage.from(PIXEL_BUCKET).upload(
    sourcePath,
    bytesToBlob(args.sourceBytes, "application/json"),
    { upsert: true, contentType: "application/json" },
  )
  if (sourceUpload.error) return { ok: false as const, error: "invalid_input" as const }

  const coverUpload = await supabase.storage.from(PIXEL_BUCKET).upload(
    coverPath,
    bytesToBlob(args.coverBytes, "image/png"),
    { upsert: true, contentType: "image/png" },
  )
  if (coverUpload.error) return { ok: false as const, error: "invalid_input" as const }

  return { ok: true as const, sourcePath, coverPath }
}

function asFile(value: FormDataEntryValue | null) {
  return value instanceof File ? value : null
}

async function readPixelPayload(formData: FormData) {
  const sourceFile = asFile(formData.get("source"))
  const coverFile = asFile(formData.get("cover"))
  if (!sourceFile || !coverFile) return { ok: false as const, error: "invalid_input" as const }
  if (sourceFile.size > PIXEL_SOURCE_MAX_BYTES || coverFile.size > PIXEL_PNG_MAX_BYTES) {
    return { ok: false as const, error: "payload_too_large" as const }
  }

  let sourceText: string
  try {
    sourceText = await sourceFile.text()
  } catch {
    return { ok: false as const, error: "invalid_input" as const }
  }
  if (sourceText.length > PIXEL_SOURCE_MAX_BYTES) {
    return { ok: false as const, error: "payload_too_large" as const }
  }

  let sourceJson: unknown
  try {
    sourceJson = JSON.parse(sourceText) as unknown
  } catch {
    return { ok: false as const, error: "invalid_input" as const }
  }

  const parsed = parsePixelSource(sourceJson)
  if (!parsed.ok) {
    return {
      ok: false as const,
      error: parsed.error === "payload_too_large" ? ("payload_too_large" as const) : ("invalid_input" as const),
    }
  }

  const coverBytes = new Uint8Array(await coverFile.arrayBuffer())
  if (coverBytes.byteLength > PIXEL_PNG_MAX_BYTES || !isPngBuffer(coverBytes)) {
    return {
      ok: false as const,
      error: coverBytes.byteLength > PIXEL_PNG_MAX_BYTES ? ("payload_too_large" as const) : ("invalid_input" as const),
    }
  }

  return {
    ok: true as const,
    sourceBytes: new TextEncoder().encode(JSON.stringify(parsed.data)),
    coverBytes,
    source: parsed.data,
  }
}

export async function createDraftAction(
  _prev: CreationActionState,
  formData: FormData,
): Promise<CreationActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = createDraftSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type") || "pixel",
    width: formData.get("width") ? Number(formData.get("width")) : undefined,
    height: formData.get("height") ? Number(formData.get("height")) : undefined,
  })
  if (!parsed.success) return { error: "invalid_input" }

  const pixelSize =
    parsed.data.type === "pixel"
      ? {
          width: parsed.data.width ?? PIXEL_SIZE_PRESETS[2].width,
          height: parsed.data.height ?? PIXEL_SIZE_PRESETS[2].height,
        }
      : undefined
  if (pixelSize && !isPixelCanvasSize(pixelSize.width, pixelSize.height)) {
    return { error: "invalid_input" }
  }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const owned = await countOwnCreations()
  if (owned >= CREATION_PER_MEMBER_MAX) return { error: "limit_reached" }

  const { data, error } = await supabase
    .from("creations")
    .insert({
      user_id: profile.id,
      title: parsed.data.title,
      type: parsed.data.type,
      category: pixelSize
        ? pixelSizeCategory(pixelSize.width, pixelSize.height)
        : null,
      content: emptyCreationContent(parsed.data.type, pixelSize),
    })
    .select("id")
    .single()

  if (error || !data) return { error: "invalid_input" }

  revalidateCreation(lang, data.id as string, profile.username)
  redirect(href(lang, `/create/${data.id}`))
}

export async function updateCreationAction(
  _prev: CreationActionState,
  formData: FormData,
): Promise<CreationActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = updateCreationSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    caption: formData.get("caption"),
    tags: formData.get("tags"),
    intent: formData.get("intent"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedCreation(parsed.data.id)
  if (!existing) return { error: "not_found" }
  if (!canMutateCreation(userId, existing.user_id)) return { error: "forbidden" }
  if (!isCreationType(existing.type)) return { error: "invalid_input" }

  if (parsed.data.intent === "unpublish") {
    return unpublishCreation(
      lang,
      existing.id,
      userId,
      existing.title,
      parsed.data.caption,
      parsed.data.tags,
    )
  }

  if (parsed.data.intent === "publish" && isUnnamedTitle(parsed.data.title)) {
    return { error: "title_required" }
  }

  if (existing.type === "pixel" || !isLegacyCreationType(existing.type)) {
    return { error: "invalid_input" }
  }

  const contentParsed = parseCreationContent(
    existing.type,
    contentFromForm(existing.type, formData),
    parsed.data.intent,
  )
  if (!contentParsed.success) {
    if ("error" in contentParsed && contentParsed.error === "payload_too_large") {
      return { error: "payload_too_large" }
    }
    return { error: "invalid_input" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const nextStatus = parsed.data.intent === "publish" ? "published" : existing.status
  const publishedAt =
    nextStatus === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at

  const { error } = await supabase
    .from("creations")
    .update({
      title: parsed.data.title,
      caption: parsed.data.caption,
      tags: parsed.data.tags,
      content: contentParsed.data as CreationContent,
      status: nextStatus,
      published_at: publishedAt,
    })
    .eq("id", existing.id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  revalidateCreation(lang, existing.id, profile?.username)
  return { ok: true, published: nextStatus === "published" }
}

export async function updatePixelCreationAction(
  _prev: CreationActionState,
  formData: FormData,
): Promise<CreationActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = updateCreationSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    caption: formData.get("caption"),
    tags: formData.get("tags"),
    intent: formData.get("intent"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedCreation(parsed.data.id)
  if (!existing) return { error: "not_found" }
  if (!canMutateCreation(userId, existing.user_id)) return { error: "forbidden" }
  if (existing.type !== "pixel") return { error: "invalid_input" }

  if (parsed.data.intent === "unpublish") {
    return unpublishCreation(
      lang,
      existing.id,
      userId,
      parsed.data.title,
      parsed.data.caption,
      parsed.data.tags,
    )
  }

  if (parsed.data.intent === "publish" && isUnnamedTitle(parsed.data.title)) {
    return { error: "title_required" }
  }

  const payload = await readPixelPayload(formData)
  if (!payload.ok) return { error: payload.error }

  const existingHeader = pixelContentSchema.safeParse(existing.content)
  if (
    existingHeader.success &&
    (payload.source.width !== existingHeader.data.width || payload.source.height !== existingHeader.data.height)
  ) {
    return { error: "invalid_input" }
  }

  const uploaded = await persistPixelFiles({
    userId,
    creationId: existing.id,
    sourceBytes: payload.sourceBytes,
    coverBytes: payload.coverBytes,
  })
  if (!uploaded.ok) return { error: uploaded.error }

  const header: PixelContent = {
    version: payload.source.version,
    width: payload.source.width,
    height: payload.source.height,
    palette: payload.source.palette,
    encoding: payload.source.encoding,
    source_path: uploaded.sourcePath,
  }
  const headerParsed = parseCreationContent("pixel", header, parsed.data.intent)
  if (!headerParsed.success) {
    if ("error" in headerParsed && headerParsed.error === "payload_too_large") {
      return { error: "payload_too_large" }
    }
    return { error: "invalid_input" }
  }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const nextStatus = parsed.data.intent === "publish" ? "published" : existing.status
  const publishedAt =
    nextStatus === "published" ? (existing.published_at ?? new Date().toISOString()) : existing.published_at

  const updatePayload: Record<string, unknown> = {
    title: parsed.data.title,
    caption: parsed.data.caption,
    tags: parsed.data.tags,
    category: pixelSizeCategory(payload.source.width, payload.source.height),
    content: headerParsed.data,
    cover_url: pixelCoverUrl(existing.id),
    status: nextStatus,
    published_at: publishedAt,
  }
  // Snapshot ink usage only on publish (not draft autosave). Unpublish keeps the last value.
  if (parsed.data.intent === "publish") {
    updatePayload.color_usage = colorUsageFromSource(payload.source)
  }

  const { error } = await supabase
    .from("creations")
    .update(updatePayload)
    .eq("id", existing.id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  revalidateCreation(lang, existing.id, profile?.username)
  return { ok: true, published: nextStatus === "published" }
}

async function unpublishCreation(
  lang: Lang,
  id: string,
  userId: string,
  title: string,
  caption: string | null,
  tags: string[],
): Promise<CreationActionState> {
  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("creations")
    .update({
      title,
      caption,
      tags,
      status: "draft",
    })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  revalidateCreation(lang, id, profile?.username)
  return { ok: true, published: false, unpublished: true }
}

export async function deleteCreationAction(formData: FormData) {
  const lang = langOf(formData.get("lang"))
  const idResult = updateCreationSchema.shape.id.safeParse(formData.get("id"))
  if (!idResult.success) redirect(href(lang, "/dashboard"))

  const userId = await getSessionUserId()
  const existing = idResult.success ? await getOwnedCreation(idResult.data) : null
  if (!userId || !existing || !canMutateCreation(userId, existing.user_id)) {
    redirect(href(lang, "/dashboard"))
  }

  if (existing.type === "pixel") {
    await removePixelObjects(existing.user_id, existing.id)
  }

  const supabase = await createServerSupabase()
  if (supabase) {
    await supabase.from("creations").delete().eq("id", existing.id).eq("user_id", userId)
  }

  const profile = await getCurrentProfile()
  revalidateCreation(lang, existing.id, profile?.username)
  redirect(href(lang, "/dashboard"))
}

export async function updateAllowPngDownloadAction(
  _prev: CreationActionState,
  formData: FormData,
): Promise<CreationActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = updateAllowPngDownloadSchema.safeParse({
    id: formData.get("id"),
    allow_png_download: formData.get("allow_png_download"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const userId = await getSessionUserId()
  if (!userId) return { error: "not_authenticated" }

  const existing = await getOwnedCreation(parsed.data.id)
  if (!existing) return { error: "not_found" }
  if (!canMutateCreation(userId, existing.user_id)) return { error: "forbidden" }
  if (existing.type !== "pixel") return { error: "invalid_input" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  const { error } = await supabase
    .from("creations")
    .update({ allow_png_download: parsed.data.allow_png_download })
    .eq("id", existing.id)
    .eq("user_id", userId)

  if (error) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  revalidateCreation(lang, existing.id, profile?.username)
  return { ok: true, published: existing.status === "published" }
}

export async function forkCreationAction(
  _prev: CreationActionState,
  formData: FormData,
): Promise<CreationActionState> {
  const lang = langOf(formData.get("lang"))
  const parsed = forkCreationSchema.safeParse({
    creation_id: formData.get("creation_id"),
  })
  if (!parsed.success) return { error: "invalid_input" }

  const profile = await getCurrentProfile()
  if (!profile) return { error: "not_authenticated" }

  const source = await getPublishedCreation(parsed.data.creation_id)
  if (!source) return { error: "not_found" }
  if (source.user_id === profile.id) {
    redirect(href(lang, `/create/${source.id}`))
  }
  if (!canForkCreation({ sessionUserId: profile.id, creationStatus: source.status })) {
    return { error: "forbidden" }
  }
  if (!isCreationType(source.type)) return { error: "invalid_input" }

  const owned = await countOwnCreations()
  if (owned >= CREATION_PER_MEMBER_MAX) return { error: "limit_reached" }

  const supabase = await createServerSupabase()
  if (!supabase) return { error: "not_configured" }

  if (source.type === "pixel") {
    const forked = await forkPixelCreation({
      supabase,
      profileId: profile.id,
      source,
    })
    if (!forked.ok) return { error: forked.error }
    revalidateCreation(lang, forked.id, profile.username)
    redirect(href(lang, `/create/${forked.id}`))
    return { ok: true, published: false }
  }

  const contentParsed = parseCreationContent(source.type, source.content, "draft")
  if (!contentParsed.success) return { error: "invalid_input" }

  const { data, error } = await supabase
    .from("creations")
    .insert({
      user_id: profile.id,
      title: source.title,
      type: source.type,
      category: source.category,
      content: contentParsed.data as CreationContent,
      forked_from: source.id,
    })
    .select("id")
    .single()

  if (error || !data) return { error: "invalid_input" }

  revalidateCreation(lang, data.id as string, profile.username)
  redirect(href(lang, `/create/${data.id}`))
}

async function downloadPixelObject(path: string) {
  const supabase = await createServerSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(PIXEL_BUCKET).download(path)
  if (error || !data) return null
  return new Uint8Array(await data.arrayBuffer())
}

async function forkPixelCreation(args: {
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabase>>>
  profileId: string
  source: {
    id: string
    user_id: string
    title: string
    category: CreationRow["category"]
  }
}): Promise<{ ok: true; id: string } | { ok: false; error: AuthErrorCode }> {
  const sourceBytes = await downloadPixelObject(
    pixelObjectPath(args.source.user_id, args.source.id, "source.json"),
  )
  const coverBytes = await downloadPixelObject(
    pixelObjectPath(args.source.user_id, args.source.id, "cover.png"),
  )
  if (!sourceBytes || !coverBytes) return { ok: false, error: "invalid_input" }
  if (sourceBytes.byteLength > PIXEL_SOURCE_MAX_BYTES || coverBytes.byteLength > PIXEL_PNG_MAX_BYTES) {
    return { ok: false, error: "payload_too_large" }
  }

  let sourceJson: unknown
  try {
    sourceJson = JSON.parse(new TextDecoder().decode(sourceBytes)) as unknown
  } catch {
    return { ok: false, error: "invalid_input" }
  }
  const parsedSource = parsePixelSource(sourceJson)
  if (!parsedSource.ok || !isPngBuffer(coverBytes)) return { ok: false, error: "invalid_input" }

  const { data, error } = await args.supabase
    .from("creations")
    .insert({
      user_id: args.profileId,
      title: args.source.title,
      type: "pixel",
      category:
        args.source.category ??
        pixelSizeCategory(parsedSource.data.width, parsedSource.data.height),
      content: emptyCreationContent("pixel", {
        width: parsedSource.data.width,
        height: parsedSource.data.height,
      }),
      forked_from: args.source.id,
    })
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: "invalid_input" }
  const creationId = data.id as string

  // Copy the origin cover PNG with the source. Playground save rewrites cover.png.
  const uploaded = await persistPixelFiles({
    userId: args.profileId,
    creationId,
    sourceBytes,
    coverBytes,
  })
  if (!uploaded.ok) {
    await args.supabase.from("creations").delete().eq("id", creationId).eq("user_id", args.profileId)
    return { ok: false, error: uploaded.error }
  }

  const header: PixelContent = {
    version: parsedSource.data.version,
    width: parsedSource.data.width,
    height: parsedSource.data.height,
    palette: parsedSource.data.palette,
    encoding: parsedSource.data.encoding,
    source_path: uploaded.sourcePath,
  }
  const headerParsed = parseCreationContent("pixel", header, "draft")
  if (!headerParsed.success) {
    await removePixelObjects(args.profileId, creationId)
    await args.supabase.from("creations").delete().eq("id", creationId).eq("user_id", args.profileId)
    return { ok: false, error: "invalid_input" }
  }

  const { error: updateError } = await args.supabase
    .from("creations")
    .update({
      content: headerParsed.data,
      cover_url: pixelCoverUrl(creationId),
    })
    .eq("id", creationId)
    .eq("user_id", args.profileId)

  if (updateError) {
    await removePixelObjects(args.profileId, creationId)
    await args.supabase.from("creations").delete().eq("id", creationId).eq("user_id", args.profileId)
    return { ok: false, error: "invalid_input" }
  }

  return { ok: true, id: creationId }
}

