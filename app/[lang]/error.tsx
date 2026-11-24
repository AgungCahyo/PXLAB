"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { buttonClassName } from "@/components/ui/Button"
import { copy } from "../../lib/copy"
import { href, isLang, type Lang } from "@/lib/i18n"
import { SITE_NAME } from "@/lib/site"

export default function LangError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const params = useParams()
  const raw = typeof params?.lang === "string" ? params.lang : "id"
  const lang: Lang = isLang(raw) ? raw : "id"

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col px-5 py-16 sm:px-8 lg:px-16">
      <p className="pixel-brand text-[clamp(1.05rem,3.2vw,1.35rem)] tracking-[0.08em]">{SITE_NAME}</p>
      <h1 className="pixel-title mt-4">{copy.errorTitle[lang]}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted">{copy.errorBody[lang]}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClassName({ size: "sm" })}>
          {copy.errorRetry[lang]}
        </button>
        <Link href={href(lang, "/")} className={buttonClassName({ size: "sm", variant: "secondary" })}>
          {copy.notFoundHome[lang]}
        </Link>
      </div>
    </div>
  )
}
