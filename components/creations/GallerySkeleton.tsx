export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="pixel-frame min-w-0 bg-card">
          <div className="pixel-thumb bg-soft" />
          <div className="mx-2.5 my-2 h-3 w-2/3 bg-soft" />
        </li>
      ))}
    </ul>
  )
}
