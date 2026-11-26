/** Shared icon-action geometry. Text colour is applied by each caller so state colours win. */
export const workActionBaseClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[2px] px-2 text-[14px] font-medium tabular-nums transition-colors hover:bg-soft focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"

/** Default icon action used by the home feed and artwork detail. */
export const workActionClass = `${workActionBaseClass} text-fg`
