export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const DEFAULT_LANG: Lang = "id";
/** Canonical name for an ID/EN text pair. */
export type LocalizedText = Record<Lang, string>;
/** Compatibility alias; new code should use LocalizedText. */
export type Bi = LocalizedText;

export const isLang = (value: string): value is Lang => value === "id" || value === "en";

/** Public URL for a path in a language. id = root, en = /en */
export function href(lang: Lang, path: string = "/"): string {
  const normalized = path === "/" ? "" : path;
  return lang === "id" ? normalized || "/" : `/en${normalized}`;
}

/** Strip a leading /en (or internal /id) from a pathname. */
export function stripLang(pathname: string): string {
  const stripped = pathname.replace(/^\/(en|id)(?=\/|$)/, "");
  return stripped === "" ? "/" : stripped;
}

export const langOf = (pathname: string): Lang =>
  /^\/en(\/|$)/.test(pathname) ? "en" : "id";

/**
 * Best-effort locale from an `Accept-Language` header (root 404, U9).
 * Honors q-values, matches primary subtags (`en-US` → `en`), and falls back
 * to {@link DEFAULT_LANG} for missing/unrecognized headers.
 */
export function langFromAcceptLanguage(header: string | null): Lang {
  if (!header) return DEFAULT_LANG;
  const candidates = header
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((candidate) => candidate.tag.length > 0 && candidate.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  for (const { tag } of candidates) {
    if (tag === "*") return DEFAULT_LANG;
    const base = tag.split("-")[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}
