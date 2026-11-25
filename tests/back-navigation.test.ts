import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("back and cancel keep unsaved work", () => {
  const playground = read("components/creations/PlaygroundForm.tsx")
  const studio = read("components/creations/StudioForm.tsx")
  const settings = read("components/profiles/SettingsForm.tsx")

  it("saves the pixel draft before leaving the playground", () => {
    expect(playground).toMatch(/updatePixelCreationAction/)
    expect(playground).toMatch(/beforeunload/)
    expect(playground).toMatch(/\/dashboard/)
    expect(playground).not.toMatch(/href=\{href\(lang, "\/create"\)\}/)
  })

  it("discards never-saved virgin drafts on leave", () => {
    expect(playground).toMatch(/discardVirginPixelDraftAction/)
    expect(playground).toMatch(/isVirginPixelDraft/)
  })

  it("guards site chrome navigation while the playground has unsaved work", () => {
    expect(playground).toMatch(/guardChromeNav/)
    expect(playground).toMatch(/app-tabbar/)
    expect(playground).toMatch(/leaveRef\.current/)
    expect(playground).toMatch(/router\.push\(leaveDestRef\.current\)/)
    // The guard resolves the chrome anchor first; unrelated clicks and
    // non-navigating clicks are never swallowed.
    expect(playground).toMatch(
      /target\.closest\("a\[href\]"\)[\s\S]*if \(!leavingRef\.current && !hasUnsavedWork\(\)\) return/,
    )
    expect(playground).not.toMatch(/if \(leavingRef\.current\) \{[\s\S]{0,80}event\.preventDefault\(\)/)
  })

  it("offers retry or leave without saving when leave save fails", () => {
    expect(playground).toMatch(/pixelLeaveBlockedTitle/)
    expect(playground).toMatch(/pixelLeaveRetry/)
    expect(playground).toMatch(/pixelLeaveDiscard/)
    expect(playground).toMatch(/leaveWithoutSaving/)
  })

  it("announces save status to assistive tech", () => {
    expect(playground).toMatch(/role="status"/)
    expect(playground).toMatch(/aria-live="polite"/)
  })

  it("saves a legacy draft before returning to My Works", () => {
    expect(studio).toMatch(/createBackToWorks/)
    expect(studio).toMatch(/intent", "draft"/)
    expect(studio).toMatch(/beforeunload/)
    expect(studio).toMatch(/\/dashboard/)
  })

  it("confirms profile edits before saving and returning to the profile", () => {
    const profileEdit = read("components/profiles/ProfileEditForm.tsx")
    expect(profileEdit).toMatch(/updateProfileAction/)
    expect(profileEdit).toMatch(/<Dialog/)
    expect(profileEdit).toMatch(/profileEditConfirmTitle/)
    expect(profileEdit).toMatch(/reportValidity/)
    expect(profileEdit).toMatch(/requestSubmit/)
    expect(profileEdit).toMatch(/router\.push/)
    expect(profileEdit).not.toMatch(/beforeunload/)
  })

  it("keeps language switch and sign out on Settings, not profile chrome", () => {
    const profile = read("app/[lang]/(public)/u/[username]/page.tsx")
    const nav = read("components/layout/SiteNav.tsx")
    expect(settings).toMatch(/LanguageSwitch/)
    expect(settings).toMatch(/LogoutButton/)
    expect(settings).toMatch(/settingsLanguage/)
    expect(settings).toMatch(/ProfileAvatar/)
    expect(settings).toMatch(/uploadAvatarAction/)
    expect(settings).toMatch(/avatarChooseFile/)
    expect(settings).toMatch(/setModal\("language"\)/)
    expect(settings).toMatch(/setModal\("signout"\)/)
    expect(settings).not.toMatch(/updateProfileAction/)
    expect(settings).not.toMatch(/roleLabel/)
    expect(profile).not.toMatch(/LogoutButton/)
    expect(nav).not.toMatch(/LogoutButton/)
    expect(nav).toMatch(/!member[\s\S]*LanguageSwitch/)
  })
})
