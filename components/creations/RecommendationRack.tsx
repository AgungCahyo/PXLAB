/** Shared sizing for detail recommendation strips — original cards, denser + horizontal scroll. */
export const recommendationStripListClass =
  "mt-3 flex min-w-0 flex-nowrap gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

/** ~2–2.5 cards visible on mobile; denser than QuietRack. */
export const recommendationStripItemClass = "w-[7.75rem] shrink-0 sm:w-[8.5rem] lg:w-[9.25rem]"

/** Lightweight placeholders while deferred recommendation sections stream in. */
export function RecommendationSkeleton({ label }: { label?: string }) {
  return (
    <div
      className="mt-8 border-t border-[color:var(--soc-hairline)] pt-6"
      role="status"
      aria-busy="true"
      aria-label={label ?? "Loading"}
    >
      <div className="h-4 w-36 bg-soft" />
      <div className={recommendationStripListClass}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={recommendationStripItemClass}>
            <div className="aspect-square bg-soft" />
            <div className="mt-2 h-3 w-16 bg-soft" />
          </div>
        ))}
      </div>
    </div>
  )
}
