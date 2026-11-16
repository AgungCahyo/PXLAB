import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { isBenignViewTransitionAbort } from "@/lib/view-transition-abort"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("view transition abort guard", () => {
  it("recognizes Chrome 153+ viewport-resize aborts", () => {
    expect(
      isBenignViewTransitionAbort(
        Object.assign(new Error("Transition was aborted because of invalid state. Viewport size changed"), {
          name: "InvalidStateError",
        }),
      ),
    ).toBe(true)
    expect(
      isBenignViewTransitionAbort(
        Object.assign(new Error("Transition was aborted because of invalid state. Document hidden"), {
          name: "InvalidStateError",
        }),
      ),
    ).toBe(true)
    expect(
      isBenignViewTransitionAbort(
        Object.assign(new Error("Transition was aborted because of invalid state. Snapshot capture failed"), {
          name: "InvalidStateError",
        }),
      ),
    ).toBe(false)
  })

  it("installs before hydration and keeps PublicShell guard", () => {
    const client = read("instrumentation-client.ts")
    const helper = read("lib/view-transition-abort.ts")
    const shell = read("components/layout/PublicShell.tsx")
    expect(client).toMatch(/installViewTransitionAbortFilter/)
    expect(helper).toMatch(/Viewport size changed/)
    expect(helper).toMatch(/reportError/)
    expect(shell).toMatch(/ViewTransitionGuard/)
  })
})
