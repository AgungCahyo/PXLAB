"use client"

import { useEffect, useRef, useState } from "react"
import { RecommendationSkeleton } from "@/components/creations/RecommendationRack"
import { SimilarWorksStrip } from "@/components/creations/SimilarWorksStrip"
import { loadSimilarCreationsAction } from "@/features/creations/recommendation-actions"
import type { CreationCard } from "@/features/creations/queries"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"
import type { CreationCategory } from "@/lib/site"

const sessionCache = new Map<string, CreationCard[]>()

function cacheKey(id: string, category: CreationCategory | null, tags: string[]) {
  return `${id}|${category ?? ""}|${tags.slice().sort().join(",")}`
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
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setArmed(false)
    setItems(null)
    setFailed(false)
    setLoading(false)
  }, [creationId])

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
    if (!armed) return
    const key = cacheKey(creationId, category, tags)
    if (retryToken === 0) {
      const cached = sessionCache.get(key)
      if (cached) {
        setItems(cached)
        setFailed(false)
        setLoading(false)
        return
      }
    }

    const requestId = ++requestIdRef.current
    let cancelled = false
    setLoading(true)
    setFailed(false)

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
        sessionCache.set(key, result.items)
        setItems(result.items)
      })
      .catch(() => {
        if (cancelled || requestId !== requestIdRef.current) return
        setFailed(true)
        setItems([])
      })
      .finally(() => {
        if (cancelled || requestId !== requestIdRef.current) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [armed, creationId, category, tags, retryToken])

  return (
    <div ref={rootRef}>
      {loading || (armed && items === null && !failed) ? (
        <RecommendationSkeleton label={copy.similarWorksTitle[lang]} />
      ) : null}
      {failed ? (
        <div className="mt-8 border-t-[3px] border-earth pt-6">
          <button
            type="button"
            onClick={() => {
              sessionCache.delete(cacheKey(creationId, category, tags))
              setItems(null)
              setRetryToken((n) => n + 1)
            }}
            className="text-[13px] text-muted underline decoration-earth/50 underline-offset-4 hover:text-fg"
          >
            {copy.recommendationRetry[lang]}
          </button>
        </div>
      ) : null}
      {items && items.length > 0 ? <SimilarWorksStrip lang={lang} items={items} /> : null}
    </div>
  )
}
