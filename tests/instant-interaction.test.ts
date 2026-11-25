import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "..")
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8")

describe("instant interaction — appreciation", () => {
  const community = read("components/community/CreationCommunity.tsx")
  const appreciate = community.slice(
    community.indexOf("function AppreciateForm"),
    community.indexOf("function ShareButton"),
  )

  it("applies optimistic appreciate state and queues the last intent", () => {
    expect(appreciate).toMatch(/toggleAppreciationAction\(null, formData\)/)
    expect(appreciate).toMatch(/flushSync/)
    expect(appreciate).toMatch(/setAppreciated\(next\)/)
    expect(appreciate).toMatch(/desiredRef\.current/)
    expect(appreciate).toMatch(/reconcileDesiredState/)
    expect(appreciate).toMatch(/formData\.set\("desired", String\(desired\)\)/)
    expect(appreciate).toMatch(/PixelHeart filled=\{appreciated\}/)
    expect(appreciate).toMatch(/workActionBaseClass/)
    expect(appreciate).toMatch(/appreciated \? "text-brick" : "text-fg"/)
    expect(appreciate).toMatch(/type="button"/)
    expect(appreciate).toMatch(/disabled:opacity-100/)
    expect(appreciate).not.toMatch(/disabled=\{pending\}/)
    expect(appreciate).not.toMatch(
      /useActionState<CommunityActionState, FormData>\(\s*toggleAppreciationAction/,
    )
  })
})

describe("instant interaction — route loading shells", () => {
  it("provides page-specific loading UI for key destinations", () => {
    expect(read("app/[lang]/(public)/creation/[id]/loading.tsx")).toMatch(/ArtworkDetailSkeleton/)
    expect(read("app/[lang]/(public)/u/[username]/loading.tsx")).toMatch(/ProfileLoadingSkeleton|ProfileSkeleton/)
    expect(read("app/[lang]/(public)/creators/loading.tsx")).toMatch(/CreatorGridSkeleton/)
    expect(read("app/[lang]/(member)/dashboard/loading.tsx")).toMatch(/WorksSkeleton/)
    expect(read("app/[lang]/(member)/create/loading.tsx")).toMatch(/CreateSkeleton/)
    expect(read("app/[lang]/(member)/create/[id]/loading.tsx")).toMatch(/StudioSkeleton/)
    expect(read("app/[lang]/(member)/profile/edit/loading.tsx")).toMatch(/RouteSkeleton/)
  })

  it("gives every page route a fallback in its own or an ancestor segment", () => {
    const appDir = path.resolve(root, "app")
    const pageDirs: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const child = path.join(dir, entry.name)
        if (existsSync(path.join(child, "page.tsx"))) pageDirs.push(child)
        walk(child)
      }
    }
    walk(appDir)
    expect(pageDirs.length).toBeGreaterThan(0)

    for (const pageDir of pageDirs) {
      let cursor = pageDir
      let covered = false
      while (cursor.startsWith(appDir)) {
        if (existsSync(path.join(cursor, "loading.tsx"))) {
          covered = true
          break
        }
        cursor = path.dirname(cursor)
      }
      expect(covered, path.relative(appDir, pageDir)).toBe(true)
    }
  })

  it("streams profile works behind a real Suspense boundary", () => {
    const page = read("app/[lang]/(public)/u/[username]/page.tsx")
    expect(page).toMatch(/const loadProfileWorks = cache\(/)
    expect(page).toMatch(/async function ProfileWorks\(/)
    expect(page).toMatch(/await loadProfileWorks\(profileId\)/)
    expect(page).toMatch(/<Suspense fallback=\{<ProfileGridSkeleton \/>\}>/)
    expect(page).not.toMatch(/const works = await listPublishedCreationsByUser\(profile\.id/)
  })

  it("shares one auth fallback across all auth pages", () => {
    const loading = read("app/[lang]/(auth)/loading.tsx")
    expect(loading).toMatch(/AuthRouteSkeleton/)
    for (const route of ["login", "register", "forgot-password", "reset-password", "verify-email"]) {
      expect(existsSync(path.resolve(root, "app/[lang]/(auth)", route, "loading.tsx")), route).toBe(false)
    }
  })
})

describe("instant interaction — conversation retry", () => {
  const community = read("components/community/CreationCommunity.tsx")

  it("keeps failed optimistic notes with retry instead of dropping them", () => {
    expect(community).toMatch(/sendStatus/)
    expect(community).toMatch(/retryFailed/)
    expect(community).toMatch(/discardFailed/)
    expect(community).toMatch(/conversationSendFailed/)
    expect(community).toMatch(/conversationRetry/)
    expect(community).toMatch(/aria-busy=\{sendStatus === "sending"/)
  })
})

describe("instant interaction — works delete", () => {
  it("hides the My Works row as soon as delete is confirmed", () => {
    const row = read("components/creations/WorksRow.tsx")
    const button = read("components/creations/WorksDeleteButton.tsx")
    expect(row).toMatch(/onDeleted=\{\(\) => setRemoved\(true\)\}/)
    expect(button).toMatch(/onSubmit=\{\(\) => \{/)
    expect(button).toMatch(/onDeleted\?\.\(\)/)
  })
})

describe("instant interaction — published creation fetch", () => {
  it("dedupes getPublishedCreation with React cache", () => {
    const queries = read("features/creations/queries.ts")
    expect(queries).toMatch(/import \{ cache \} from "react"/)
    expect(queries).toMatch(/export const getPublishedCreation = cache\(/)
  })

  it("loads detail artwork with high fetch priority", () => {
    expect(read("components/creations/PixelArt.tsx")).toMatch(/fetchPriority=\{priority \? "high"/)
    expect(read("app/[lang]/(public)/creation/[id]/page.tsx")).toMatch(/priority/)
  })
})
