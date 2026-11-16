import { cacheLife } from "next/cache"
import { SITE_NAME } from "@/lib/site"

async function copyrightYear() {
  "use cache"
  cacheLife("max")
  return new Date().getFullYear()
}

export async function SiteFooter() {
  "use cache"
  const year = await copyrightYear()

  return (
    <footer>
      <p className="mx-auto max-w-7xl px-5 py-4 text-[12px] text-muted sm:px-8 lg:px-16">
        © {year} {SITE_NAME}
      </p>
    </footer>
  )
}
