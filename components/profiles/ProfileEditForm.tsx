"use client"

import { useActionState, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { updateProfileAction, type ProfileActionState } from "@/features/profiles/actions"
import type { MemberProfile } from "@/lib/auth/session"
import { copy } from "@/lib/copy"
import { href, type Lang } from "@/lib/i18n"

/** Dedicated edit surface; the confirmation dialog guards every save. */
export function ProfileEditForm({ lang, profile }: { lang: Lang; profile: MemberProfile }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)
  const [confirming, setConfirming] = useState(false)

  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    async (prev, formData) => {
      const result = await updateProfileAction(prev, formData)
      if (result && "ok" in result) {
        const username = String(formData.get("username") ?? profile.username ?? "")
        router.push(href(lang, `/u/${username}`))
      }
      return result
    },
    null,
  )

  const confirm = () => {
    const form = formRef.current
    if (!form?.reportValidity()) return
    confirmedRef.current = true
    setConfirming(false)
    form.requestSubmit()
  }

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={(event) => {
          if (confirmedRef.current) {
            confirmedRef.current = false
            return
          }
          event.preventDefault()
          setConfirming(true)
        }}
        className="mt-6 grid gap-4"
      >
        <input type="hidden" name="lang" value={lang} />

        {state && "error" in state ? (
          <Alert tone="error" flat>
            {copy.errors[state.error][lang]}
          </Alert>
        ) : null}
        {state && "ok" in state ? (
          <Alert tone="info" flat>
            {copy.profileEditSaved[lang]}
          </Alert>
        ) : null}

        <Input
          id="displayName"
          name="displayName"
          type="text"
          required
          maxLength={50}
          defaultValue={profile.display_name ?? ""}
          label={copy.displayNameLabel[lang]}
        />
        <Input
          id="username"
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={20}
          defaultValue={profile.username ?? ""}
          label={copy.usernameLabel[lang]}
          hint={copy.usernameHint[lang]}
        />
        <Textarea
          id="bio"
          name="bio"
          maxLength={280}
          defaultValue={profile.bio ?? ""}
          label={copy.bioLabel[lang]}
        />
        <Input
          id="location"
          name="location"
          type="text"
          maxLength={60}
          defaultValue={profile.location ?? ""}
          label={copy.locationLabel[lang]}
        />
        <Input
          id="website"
          name="website"
          type="url"
          maxLength={200}
          defaultValue={profile.website ?? ""}
          label={copy.websiteLabel[lang]}
          hint={copy.websiteHint[lang]}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending || undefined}
            className={socialButtonClass({ variant: "solid", size: "md" })}
          >
            {pending ? copy.settingsSaving[lang] : copy.profileEditSave[lang]}
          </button>
        </div>
      </form>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={copy.profileEditConfirmTitle[lang]}
        closeLabel={copy.createCancel[lang]}
        tone="social"
      >
        <div className="grid gap-4 px-5 py-5">
          <p className="text-[14px] leading-relaxed text-muted">{copy.profileEditConfirmBody[lang]}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={socialButtonClass({ variant: "ghost", size: "md" })}
            >
              {copy.createCancel[lang]}
            </button>
            <button
              type="button"
              onClick={confirm}
              className={socialButtonClass({ variant: "solid", size: "md" })}
            >
              {copy.profileEditConfirmAction[lang]}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
