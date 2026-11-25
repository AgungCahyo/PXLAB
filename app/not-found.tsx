import { DM_Sans, Press_Start_2P } from "next/font/google"
import Link from "next/link"
import { headers } from "next/headers"
import { copy } from "../lib/copy"
import { langFromAcceptLanguage } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"
import "./globals.css"

/**
 * U9 reads `Accept-Language` via `headers()` at request time. With Cache
 * Components, runtime data outside `<Suspense>` blocks prerendering; a 404 is
 * fine to render on demand, so opt the route out (`blocking-prerender-dynamic`
 * → "allow blocking route" in the bundled Next.js docs).
 */
export const instant = false

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
})

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
  display: "swap",
})

/**
 * Root fallback when no lang segment is available.
 * U9: locale comes from `Accept-Language` (server component per next.js docs —
 * root not-found ships with every route, so no client hooks here).
 */
export default async function RootNotFound() {
  const lang = langFromAcceptLanguage((await headers()).get("accept-language"))

  return (
    <html lang={lang} className={`${sans.variable} ${pixel.variable}`}>
      <body>
        <main id="main" className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-16 sm:px-8">
          <p className="pixel-brand text-[clamp(1.05rem,3.2vw,1.35rem)] tracking-[0.08em]">
            {SITE_NAME}
          </p>
          <h1 className="pixel-title mt-4">{copy.notFoundTitle[lang]}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{copy.notFoundBody[lang]}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-2xl border border-purple-600/50 bg-[#6355d8] px-5 text-[14px] font-medium text-white shadow-sm shadow-purple-500/15 transition-colors hover:bg-[#5245c7]"
            >
              {copy.notFoundHome[lang]}
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-card px-5 text-[14px] font-medium text-fg shadow-sm transition-colors hover:bg-slate-50"
            >
              {copy.nav.explore[lang]}
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
