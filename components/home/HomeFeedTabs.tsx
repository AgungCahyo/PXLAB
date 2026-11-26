"use client"

import { TabLink } from "@/components/social/Pill"
import { useScrollDirection } from "@/components/home/useScrollDirection"
import { socialCopy } from "@/lib/copy-social"
import { href, type Lang } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { FeedKind } from "@/features/feed/queries"

export function HomeFeedTabs({ lang, feed }: { lang: Lang; feed: FeedKind }) {
  const hidden = useScrollDirection()
  const t = socialCopy.feed

  return (
    <div
      inert={hidden || undefined}
      className={cn(
        "sticky top-[var(--sticky-top,5px)] z-30 bg-bg/95 backdrop-blur-sm transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none",
        hidden
          ? "pointer-events-none -translate-y-full opacity-0"
          : "translate-y-0 opacity-100",
      )}
      aria-hidden={hidden ? true : undefined}
    >
      <nav aria-label={t.tabsAria[lang]} className="flex border-b border-slate-200/80">
        <TabLink href={href(lang, "/home")} selected={feed === "all"}>
          {t.forYou[lang]}
        </TabLink>
        <TabLink href={`${href(lang, "/home")}?feed=following`} selected={feed === "following"}>
          {t.following[lang]}
        </TabLink>
      </nav>
    </div>
  )
}
