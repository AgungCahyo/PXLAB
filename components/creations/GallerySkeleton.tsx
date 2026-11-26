export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="min-w-0 overflow-hidden rounded-none border border-line bg-card p-3">
          <div className="aspect-square w-full bg-soft" />
          <div className="mt-2.5 h-4 w-2/3 bg-soft" />
          <div className="mt-1.5 h-3 w-1/3 bg-soft" />
        </li>
      ))}
    </ul>
  )
}
