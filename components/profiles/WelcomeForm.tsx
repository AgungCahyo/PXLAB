"use client"

import { useActionState, useMemo, useState } from "react"
import Link from "next/link"
import { GeneratedAvatar } from "@/components/profiles/GeneratedAvatar"
import { Alert } from "@/components/ui/Alert"
import { Button, buttonClassName } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { completeOnboardingAction, type ProfileActionState } from "@/features/profiles/actions"
import {
  defaultAvatarConfig,
  generateAvatarCandidates,
  type AvatarConfig,
} from "@/lib/avatar-gen"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "../../lib/copy"
import { href, type Lang } from "@/lib/i18n"
import { authDestination } from "@/lib/paths"
import { cn } from "@/lib/utils"

type Step = "avatar" | "identity" | "done"

export function WelcomeForm({
  lang,
  profile,
  next,
}: {
  lang: Lang
  profile: MemberProfile
  next: string
}) {
  const [step, setStep] = useState<Step>("avatar")
  const [round, setRound] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [skippedAvatar, setSkippedAvatar] = useState(false)

  const candidates = useMemo(
    () => generateAvatarCandidates(profile.id, round, 8),
    [profile.id, round],
  )
  const selected: AvatarConfig | null =
    selectedIndex != null ? (candidates[selectedIndex] ?? null) : null
  const preview = selected ?? (skippedAvatar ? defaultAvatarConfig(profile.id) : null)

  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    async (prev, formData) => {
      const result = await completeOnboardingAction(prev, formData)
      if (result && "ok" in result) setStep("done")
      return result
    },
    null,
  )

  const exploreHref = authDestination(lang, next)
  const error = state && "error" in state ? copy.errors[state.error][lang] : null

  if (step === "done") {
    return (
      <div className="mt-8 grid gap-4">
        <p className="text-[15px] leading-relaxed text-muted">{copy.welcomeReady[lang]}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={href(lang, "/create")} className={buttonClassName({ variant: "primary" })}>
            {copy.welcomeCreate[lang]}
          </Link>
          <Link href={exploreHref} className={buttonClassName({ variant: "outline" })}>
            {copy.welcomeExplore[lang]}
          </Link>
        </div>
      </div>
    )
  }

  if (step === "avatar") {
    return (
      <div className="mt-8 grid gap-5">
        <div>
          <h2 className="text-[15px] font-medium text-fg">{copy.welcomeAvatarTitle[lang]}</h2>
          <p className="mt-1 text-[13px] text-muted">{copy.welcomeAvatarHint[lang]}</p>
        </div>

        <div className="mx-auto h-28 w-28 overflow-hidden border-[3px] border-earth bg-soft shadow-[4px_4px_0_0_var(--fg)]">
          {preview ? (
            <GeneratedAvatar config={preview} title={copy.welcomeAvatarPreview[lang]} />
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-muted">
              {copy.welcomeAvatarPick[lang]}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {candidates.map((config, index) => {
            const active = selectedIndex === index
            return (
              <button
                key={`${round}-${index}`}
                type="button"
                aria-pressed={active}
                aria-label={copy.welcomeAvatarOption[lang].replace("{n}", String(index + 1))}
                onClick={() => {
                  setSkippedAvatar(false)
                  setSelectedIndex(index)
                }}
                className={cn(
                  "aspect-square overflow-hidden border-[3px] border-earth bg-soft",
                  active ? "shadow-[3px_3px_0_0_var(--fg)]" : "hover:shadow-[2px_2px_0_0_var(--fg)]",
                )}
              >
                <GeneratedAvatar config={config} />
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelectedIndex(null)
              setRound((n) => n + 1)
            }}
          >
            {copy.welcomeAvatarShuffle[lang]}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSelectedIndex(null)
              setSkippedAvatar(true)
              setStep("identity")
            }}
          >
            {copy.welcomeAvatarSkip[lang]}
          </Button>
          <Button
            type="button"
            className="ml-auto"
            disabled={selectedIndex == null && !skippedAvatar}
            onClick={() => setStep("identity")}
          >
            {copy.welcomeAvatarContinue[lang]}
          </Button>
        </div>
      </div>
    )
  }

  const avatarPayload = JSON.stringify(preview ?? defaultAvatarConfig(profile.id))

  return (
    <div className="mt-8 grid gap-5">
      <div>
        <h2 className="text-[15px] font-medium text-fg">{copy.welcomeIdentityTitle[lang]}</h2>
        <p className="mt-1 text-[13px] text-muted">{copy.welcomeIdentityHint[lang]}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-14 w-14 overflow-hidden border-[3px] border-earth bg-soft">
          <GeneratedAvatar config={preview ?? defaultAvatarConfig(profile.id)} />
        </div>
        <button
          type="button"
          className="text-[13px] text-muted underline decoration-earth/50 underline-offset-4 hover:text-fg"
          onClick={() => setStep("avatar")}
        >
          {copy.welcomeAvatarChange[lang]}
        </button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <form action={action} className="grid gap-4">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="avatarConfig" value={avatarPayload} />
        <Input
          id="username"
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_]+"
          defaultValue={profile.username ?? ""}
          label={copy.usernameLabel[lang]}
          hint={copy.usernameHint[lang]}
        />
        <Input
          id="displayName"
          name="displayName"
          required
          autoComplete="nickname"
          maxLength={50}
          defaultValue={profile.display_name ?? ""}
          label={copy.displayNameLabel[lang]}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep("avatar")}>
            {copy.welcomeBack[lang]}
          </Button>
          <Button
            type="submit"
            className="ml-auto"
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? copy.welcomeSubmitting[lang] : copy.welcomeSubmit[lang]}
          </Button>
        </div>
      </form>
    </div>
  )
}
