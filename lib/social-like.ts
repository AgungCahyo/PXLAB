/**
 * Race-safe optimistic toggles.
 *
 * `reconcileToggle` is kept for callers whose backend only exposes a toggle.
 * New callers should use `reconcileDesiredState`: the client sends the exact
 * state the user wants, so repeated or reordered requests cannot flip the row
 * twice. Both helpers run strictly one request at a time and keep looping until
 * the confirmed state matches the last intent, so rapid taps converge without
 * double submission. On failure they roll back to the confirmed state.
 */

export type DesiredStateResult = {
  ok: boolean
  /** Authoritative state from the server, when it returned one. */
  state?: boolean
  count?: number
}

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

export async function reconcileDesiredState(args: {
  getDesired: () => boolean
  getConfirmed: () => boolean
  /** Sends the exact desired state to the backend, never a blind toggle. */
  setState: (desired: boolean) => Promise<DesiredStateResult>
  /** Called after every accepted response, including the server's counts. */
  onConfirmed: (state: boolean, count?: number) => void
  /** Adopt a server-corrected state only if the user did not tap again mid-flight. */
  onDesired?: (state: boolean) => void
  onRollback: (confirmed: boolean) => void
}): Promise<"synced" | "rolled_back"> {
  while (args.getDesired() !== args.getConfirmed()) {
    const sentDesired = args.getDesired()
    let result: DesiredStateResult = { ok: false }
    try {
      result = await args.setState(sentDesired)
    } catch {
      result = { ok: false }
    }
    if (!result.ok) {
      args.onRollback(args.getConfirmed())
      return "rolled_back"
    }
    // Trust the server's authoritative value when it supplies one.
    const confirmed = result.state ?? sentDesired
    args.onConfirmed(confirmed, result.count)
    // A newer tap during the request must win; otherwise adopt server authority
    // so a rejected/normalized write cannot restart the loop.
    if (args.getDesired() === sentDesired) args.onDesired?.(confirmed)
  }
  return "synced"
}
