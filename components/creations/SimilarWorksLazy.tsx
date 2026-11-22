"use client"

import { useEffect, useRef, useState } from "react"
import { RecommendationSkeleton } from "@/components/creations/RecommendationRack"
import { SimilarWorksStrip } from "@/components/creations/SimilarWorksStrip"
import { socialButtonClass } from "@/components/social/socialButton"
import { SocialEmptyState } from "@/components/social/SocialEmptyState"
import { SectionHeader } from "@/components/ui/PageHeader"
import { loadSimilarCreationsAction } from "@/features/creations/recommendation-actions"
import type { CreationCard } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationCategory } from "@/lib/site"

const SESSION_CACHE_MAX = 32
const sessionCache = new Map<string, CreationCard[]>()

function cacheKey(id: string, category: CreationCategory | null, tags: string[]) {
  return `${id}|${category ?? ""}|${tags.slice().sort().join(",")}`
}

function peekCached(key: string) {
  return sessionCache.get(key)
}

function writeCached(key: string, value: CreationCard[]) {
  sessionCache.delete(key)
  sessionCache.set(key, value)
  while (sessionCache.size > SESSION_CACHE_MAX) {
    const oldest = sessionCache.keys().next().value
    if (oldest === undefined) break
    sessionCache.delete(oldest)
  }
}

export function SimilarWorksLazy({
  lang,
  creationId,
  category,
  tags,
}: {
  lang: Lang
  creationId: string
  category: CreationCategory | null
  tags: string[]
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)
  const [armed, setArmed] = useState(false)
  const [retryToken, setRetryToken] = useState(0)
  const [items, setItems] = useState<CreationCard[] | null>(null)
  const [failed, setFailed] = useState(false)

  const key = cacheKey(creationId, category, tags)
  const cached = retryToken === 0 ? peekCached(key) : undefined
  const effectiveItems = items ?? cached ?? null
  const pending = armed && !cached && items === null && !failed

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setArmed(true)
          observer.disconnect()
        }
      },
      { rootMargin: "240px 0px", threshold: 0.01 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [creationId])

  useEffect(() => {
    if (!armed || cached) return
    const requestId = ++requestIdRef.current
    let cancelled = false

    void loadSimilarCreationsAction({
      id: creationId,
      category,
      tags,
      limit: 6,
    })
      .then((result) => {
        if (cancelled || requestId !== requestIdRef.current) return
        if (result.failed) {
          setFailed(true)
          setItems([])
          return
        }
        writeCached(key, result.items)
        setItems(result.items)
      })
      .catch(() => {
        if (cancelled || requestId !== requestIdRef.current) return
        setFailed(true)
        setItems([])
      })

    return () => {
      cancelled = true
    }
  }, [armed, cached, key, creationId, category, tags, retryToken])

  return (
    <div ref={rootRef}>
      {pending ? <RecommendationSkeleton label={copy.similarWorksTitle[lang]} /> : null}
      {failed ? (
        <section className="mt-8 border-t border-[color:var(--soc-hairline)] pt-6" aria-labelledby="similar-works-heading">
          <SectionHeader id="similar-works-heading" title={copy.similarWorksTitle[lang]} />
          <SocialEmptyState
            title={copy.exploreLoadError[lang]}
            description={copy.exploreLoadHint[lang]}
            action={
              <button
                type="button"
                onClick={() => {
                  sessionCache.delete(key)
                  setItems(null)
                  setFailed(false)
                  setRetryToken((n) => n + 1)
                }}
                className={socialButtonClass({ variant: "soft", size: "sm" })}
              >
                {copy.recommendationRetry[lang]}
              </button>
            }
          />
        </section>
      ) : null}
      {effectiveItems && effectiveItems.length > 0 ? (
        <SimilarWorksStrip lang={lang} items={effectiveItems} />
      ) : null}
    </div>
  )
}
