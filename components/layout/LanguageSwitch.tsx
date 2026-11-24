"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { copy } from "../../lib/copy"
import { href, stripLang, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LanguageSwitch({
  lang,
  className,
}: {
  lang: Lang
  className?: string
}) {
  const pathname = usePathname() ?? "/"
  const here = stripLang(pathname)
  const other: Lang = lang === "id" ? "en" : "id"

  // The root layout owns <html lang>. Keep it correct after a client-side
  // locale change even if that layout segment does not re-render.
  useEffect(() => {
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang
    }
  }, [lang])

  return (
    <Link
      href={href(other, here)}
      hrefLang={other}
      lang={other}
      scroll={false}
      aria-label={other === "en" ? copy.switchToEn[lang] : copy.switchToId[lang]}
      className={cn(
        "inline-flex h-11 min-w-[4.25rem] items-center justify-center gap-1.5 border-[3px] border-earth bg-card px-3 text-[12px] font-medium tracking-wide hover:bg-soft",
        className,
      )}
    >
      <span className={lang === "id" ? "text-fg" : "text-muted"}>ID</span>
      <span aria-hidden="true" className="h-3 w-px bg-line" />
      <span className={lang === "en" ? "text-fg" : "text-muted"}>EN</span>
    </Link>
  )
}
