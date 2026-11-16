export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="pixel-frame bg-card">
          <div className="pixel-thumb bg-soft" />
          <div className="mx-3 my-3 h-4 w-2/3 bg-soft" />
        </li>
      ))}
    </ul>
  )
}
