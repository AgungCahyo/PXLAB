export const SITE_NAME = "PXLB"
/** Canonical production origin. Override locally with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = "https://pxlb.fun"
/** Previous production host — keep reachable via DNS redirect until cutover is verified. */
export const LEGACY_SITE_URL = "https://commons.agungcahyo.my.id"
export const OWNER_NAME = "Agung Cahyo"
export const SITE_POSITIONING = "A creative playground for pixel art."

export const NAV_ITEMS = [
  { href: "/explore", key: "explore" },
  { href: "/create", key: "create" },
] as const;

/** Secondary destinations — not primary nav. */
export const NAV_SECONDARY = [{ href: "/space", key: "space" }] as const;

export const LEGACY_CREATION_TYPES = ["text", "visual", "idea", "story"] as const;
export const CREATION_TYPES = ["pixel", ...LEGACY_CREATION_TYPES] as const;
export type CreationType = (typeof CREATION_TYPES)[number];
export type LegacyCreationType = (typeof LEGACY_CREATION_TYPES)[number];

export function isCreationType(value: string): value is CreationType {
  return (CREATION_TYPES as readonly string[]).includes(value);
}

export function isLegacyCreationType(value: string): value is LegacyCreationType {
  return (LEGACY_CREATION_TYPES as readonly string[]).includes(value);
}

/**
 * Discovery filter for pixel works = canvas size preset (+ custom).
 * Matches PIXEL_SIZE_PRESETS ids in lib/pixel.ts.
 */
export const CREATION_CATEGORIES = [
  "icon",
  "small",
  "sprite",
  "medium",
  "large",
  "poster",
  "custom",
] as const;
export type CreationCategory = (typeof CREATION_CATEGORIES)[number];

export function isCreationCategory(value: string): value is CreationCategory {
  return (CREATION_CATEGORIES as readonly string[]).includes(value);
}

export const EXPLORE_SEARCH_MAX = 80;

export function pixelObjectPath(
  userId: string,
  creationId: string,
  file: "source.json" | "cover.png",
) {
  return `${userId}/${creationId}/${file}`;
}

export function pixelCoverUrl(creationId: string) {
  return `/api/pixel-cover/${creationId}`;
}

export const CREATION_STATUSES = ["draft", "published", "hidden"] as const;
export type CreationStatus = (typeof CREATION_STATUSES)[number];

export const CREATION_TITLE_MAX = 80;
export const CREATION_CAPTION_MAX = 500;
export const CREATION_TAGS_MAX = 5;
export const CREATION_TAG_MIN_LEN = 2;
export const CREATION_TAG_MAX_LEN = 24;
/** Dominant colors shown before “see all” on the detail Color Usage Bar. */
export const COLOR_USAGE_PREVIEW_MAX = 12;
export const CREATION_TEXT_BODY_MAX = 8000;
export const CREATION_IDEA_BODY_MAX = 2000;
export const CREATION_IDEA_CONTEXT_MAX = 1000;
export const CREATION_STORY_BODY_MAX = 12_000;
export const CREATION_STORY_PROMPT_MAX = 280;
export const CREATION_VISUAL_TEXT_MAX = 80;
export const CREATION_VISUAL_MAX_ELEMENTS = 24;
export const CREATION_CONTENT_JSON_MAX = 32_000;
export const PIXEL_SOURCE_MAX_BYTES = 512 * 1024;
export const PIXEL_PNG_MAX_BYTES = 512 * 1024;
export const PIXEL_BUCKET = "pixel-creations";

/** Profile photo storage (public bucket). */
export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 512 * 1024;
/** Longest edge after compress/resize for oversized uploads. */
export const AVATAR_MAX_EDGE = 512;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMimeType = (typeof AVATAR_MIME_TYPES)[number];

export function isAvatarMimeType(value: string): value is AvatarMimeType {
  return (AVATAR_MIME_TYPES as readonly string[]).includes(value);
}

/** Fixed object key per member — upsert replaces the previous photo. */
export function avatarObjectPath(userId: string) {
  return `${userId}/avatar`;
}
export const CREATION_PER_MEMBER_MAX = 100;
export const EXPLORE_PAGE_SIZE = 12;

/** Allowlisted fills for visual creations. No arbitrary color strings. */
export const VISUAL_FILLS = [
  "#15131c",
  "#f4f2ef",
  "#9a45e0",
  "#7a2fc0",
  "#c45c26",
  "#2f6f5e",
] as const;
export type VisualFill = (typeof VISUAL_FILLS)[number];

export function isVisualFill(value: string): value is VisualFill {
  return (VISUAL_FILLS as readonly string[]).includes(value);
}

/**
 * Common Space uses a normalized coordinate system.
 * The public canvas SVG uses viewBox "0 0 1000 1000".
 * Origin is top-left. Rectangle x/y is top-left; circle x/y is center;
 * text x/y is the top-left of the glyph box (SVG hanging baseline).
 * The canvas scales with the viewport; stored numbers stay in 0–1000.
 */
export const SPACE_VIEWBOX = "0 0 1000 1000";
export const SPACE_SIZE = 1000;
export const SPACE_ELEMENT_TYPES = ["text", "shape"] as const;
export type SpaceElementType = (typeof SPACE_ELEMENT_TYPES)[number];
export const SPACE_SHAPE_KINDS = ["rectangle", "circle"] as const;
export type SpaceShapeKind = (typeof SPACE_SHAPE_KINDS)[number];
export const SPACE_FONT_SIZES = [16, 24, 36] as const;
export type SpaceFontSize = (typeof SPACE_FONT_SIZES)[number];
export const SPACE_TEXT_MAX = 120;
export const SPACE_CONTENT_JSON_MAX = 2000;
export const SPACE_PER_MEMBER_MAX = 40;
export const SPACE_PER_MEMBER_PER_HOUR = 8;
export const SPACE_CANVAS_MAX = 800;
export const SPACE_DEFAULT_RECT = { width: 160, height: 100 } as const;
export const SPACE_DEFAULT_CIRCLE_R = 50;

/** One fixed appreciation type. Unique per member and creation. Not a ranking. */
export const REACTION_TYPE = "appreciate" as const;
export const REACTION_TYPES = [REACTION_TYPE] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const COMMENT_STATUSES = ["published", "hidden"] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export const COMMENT_BODY_MAX = 1000;
export const COMMENT_PER_HOUR = 12;
export const COMMENT_PER_CREATION_MAX = 100;
export const COMMENTS_PAGE_SIZE = 20;
/** Outgoing follows per rolling hour (spam guard). */
export const FOLLOW_PER_HOUR = 40;

export const REPORT_TARGET_TYPES = ["creation", "comment", "space_element"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export const REPORT_REASONS = ["spam", "harassment", "illegal", "off_topic", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_STATUSES = ["pending", "reviewed", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export const REPORT_DETAILS_MAX = 500;
export const REPORT_PER_HOUR = 8;

export function isReportTargetType(value: string): value is ReportTargetType {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(value);
}

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}
