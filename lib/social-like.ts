/**
 * Race-safe optimistic toggle.
 *
 * The backend action is a *toggle* (not "set"), so two requests in flight at once can
 * cancel each other out. This runs strictly one request at a time and keeps going until
 * the confirmed state matches what the user last asked for, so rapid taps converge on the
 * right state without double submission. On failure it rolls back to the confirmed state.
 */
export async function reconcileToggle(args: {
  getDesired: () => boolean
  getConfirmed: () => boolean
  setConfirmed: (value: boolean) => void
  /** Performs ONE toggle on the backend. Resolve true on success. */
  toggle: () => Promise<boolean>
  onRollback: (confirmed: boolean) => void
}): Promise<"synced" | "rolled_back"> {
  while (args.getDesired() !== args.getConfirmed()) {
    let ok = false
    try {
      ok = await args.toggle()
    } catch {
      ok = false
    }
    if (!ok) {
      args.onRollback(args.getConfirmed())
      return "rolled_back"
    }
    args.setConfirmed(!args.getConfirmed())
  }
  return "synced"
}
