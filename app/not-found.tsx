import { DM_Sans, Press_Start_2P } from "next/font/google"
import Link from "next/link"
import { copy } from "../lib/copy"
import { SITE_NAME } from "@/lib/site"
import "./globals.css"

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

/** Root fallback when no lang segment is available. */
export default function RootNotFound() {
  const lang = "id" as const

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
              className="inline-flex min-h-11 items-center border-[3px] border-earth bg-brick px-4 text-[14px] text-white shadow-[4px_4px_0_0_var(--fg)]"
            >
              {copy.notFoundHome[lang]}
            </Link>
            <Link
              href="/explore"
              className="inline-flex min-h-11 items-center border-[3px] border-earth bg-card px-4 text-[14px] text-fg hover:bg-soft"
            >
              {copy.nav.explore[lang]}
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
