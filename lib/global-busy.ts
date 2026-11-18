type Listener = (depth: number) => void

let depth = 0
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(depth)
}

/** Subscribe to global busy depth (navigations, actions, studio persist). */
export function subscribeGlobalBusy(listener: Listener) {
  listeners.add(listener)
  listener(depth)
  return () => {
    listeners.delete(listener)
  }
}

export function beginGlobalBusy() {
  depth += 1
  emit()
}

export function endGlobalBusy() {
  depth = Math.max(0, depth - 1)
  emit()
}

/** Run work while holding a global busy mark (safe with try/finally). */
export async function withGlobalBusy<T>(work: () => Promise<T>): Promise<T> {
  beginGlobalBusy()
  try {
    return await work()
  } finally {
    endGlobalBusy()
  }
}
