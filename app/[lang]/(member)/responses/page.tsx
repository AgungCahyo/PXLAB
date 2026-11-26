import { notFound, redirect } from "next/navigation"

export const instant = false

import { href, isLang } from "@/lib/i18n"

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang: raw } = await params
  if (!isLang(raw)) notFound()
  redirect(href(raw, "/activity"))
}
