export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const DEFAULT_LANG: Lang = "id";
export type Bi = Record<Lang, string>;

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
