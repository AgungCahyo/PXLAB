import type { Metadata, Viewport } from "next";
import { DM_Sans, Press_Start_2P } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { PublicShell } from "@/components/layout/PublicShell";
import { copy } from "../../lib/copy";
import { LANGS, isLang } from "@/lib/i18n";
import { defaultTitle } from "@/lib/meta";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "../globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
});

export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: defaultTitle(lang, copy.tagline), template: `%s — ${SITE_NAME}` },
    description: copy.description[lang],
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/icon", sizes: "32x32", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdf7",
};

export default async function LangLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html
      lang={lang}
      className={`${sans.variable} ${pixel.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <PublicShell lang={lang}>{children}</PublicShell>
      </body>
    </html>
  );
}
