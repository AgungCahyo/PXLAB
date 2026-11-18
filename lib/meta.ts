import type { Metadata } from "next";
import { href, type Bi, type Lang } from "@/lib/i18n";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export function pageMeta({
  lang,
  path,
  title,
  description,
  absoluteTitle = false,
  noIndex = false,
  image,
  imageWidth = 1200,
  imageHeight = 630,
  ogType = "website",
}: {
  lang: Lang;
  path: string;
  title: Bi | string;
  description: Bi | string;
  absoluteTitle?: boolean;
  noIndex?: boolean;
  /** Absolute or site-relative image URL for og:image / twitter:image. */
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  ogType?: "website" | "article";
}): Metadata {
  const resolvedTitle = typeof title === "string" ? title : title[lang];
  const resolvedDescription = typeof description === "string" ? description : description[lang];
  const canonical = new URL(href(lang, path), SITE_URL).toString();
  const imageUrl = image ? new URL(image, SITE_URL).toString() : undefined;

  return {
    title: absoluteTitle ? { absolute: resolvedTitle } : resolvedTitle,
    description: resolvedDescription,
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical,
      languages: {
        id: new URL(href("id", path), SITE_URL).toString(),
        en: new URL(href("en", path), SITE_URL).toString(),
      },
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonical,
      siteName: SITE_NAME,
      locale: lang === "id" ? "id_ID" : "en_US",
      type: ogType,
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: imageWidth,
                height: imageHeight,
                alt: resolvedTitle,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: resolvedTitle,
      description: resolvedDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export function defaultTitle(lang: Lang, tagline: Bi) {
  return `${SITE_NAME} — ${tagline[lang]}`;
}
