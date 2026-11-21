import { describe, expect, it } from "vitest"
import { reconcileToggle } from "@/lib/social-like"

function harness(initial: boolean, toggle: () => Promise<boolean>) {
  const state = { desired: initial, confirmed: initial, rolledBack: null as boolean | null, calls: 0 }
  const run = () =>
    reconcileToggle({
      getDesired: () => state.desired,
      getConfirmed: () => state.confirmed,
      setConfirmed: (v) => {
        state.confirmed = v
      },
      toggle: async () => {
        state.calls += 1
        return toggle()
      },
      onRollback: (v) => {
        state.rolledBack = v
        state.desired = v
      },
    })
  return { state, run }
}

describe("reconcileToggle", () => {
  it("does nothing when already in sync", async () => {
    const h = harness(false, async () => true)
    expect(await h.run()).toBe("synced")
    expect(h.state.calls).toBe(0)
  })

  it("sends exactly one toggle for a single tap", async () => {
    const h = harness(false, async () => true)
    h.state.desired = true
    await h.run()
    expect(h.state.calls).toBe(1)
    expect(h.state.confirmed).toBe(true)
  })

  it("collapses like→unlike→like during one request into a net single toggle", async () => {
    let first = true
    const h = harness(false, async () => {
      if (first) {
        first = false
        // user taps twice more while the first request is in flight
        h.state.desired = false
        h.state.desired = true
      }
      return true
    })
    h.state.desired = true
    await h.run()
    expect(h.state.calls).toBe(1)
    expect(h.state.confirmed).toBe(true)
  })

  it("follows up when the user ends on the opposite state", async () => {
    let first = true
    const h = harness(false, async () => {
      if (first) {
        first = false
        h.state.desired = false // unliked while request was in flight
      }
      return true
    })
    h.state.desired = true
    await h.run()
    expect(h.state.calls).toBe(2)
    expect(h.state.confirmed).toBe(false)
  })

  it("never runs two requests concurrently", async () => {
    let inFlight = 0
    let max = 0
    const h = harness(false, async () => {
      inFlight += 1
      max = Math.max(max, inFlight)
      await Promise.resolve()
      inFlight -= 1
      return true
    })
    h.state.desired = true
    await h.run()
    expect(max).toBe(1)
  })

  it("rolls back to the confirmed state on failure", async () => {
    const h = harness(false, async () => false)
    h.state.desired = true
    expect(await h.run()).toBe("rolled_back")
    expect(h.state.rolledBack).toBe(false)
    expect(h.state.confirmed).toBe(false)
  })

  it("treats a thrown error as failure", async () => {
    const h = harness(true, async () => {
      throw new Error("network")
    })
    h.state.desired = false
    expect(await h.run()).toBe("rolled_back")
    expect(h.state.rolledBack).toBe(true)
  })
})
