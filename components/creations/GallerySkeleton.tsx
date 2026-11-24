export function GallerySkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-card p-3 shadow-sm">
          <div className="aspect-square w-full rounded-xl bg-slate-100" />
          <div className="mt-2.5 h-4 w-2/3 rounded bg-slate-100" />
          <div className="mt-1.5 h-3 w-1/3 rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  )
}
