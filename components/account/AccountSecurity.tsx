"use client"

import { useActionState, useState, type ReactNode } from "react"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Input } from "@/components/ui/Input"
import {
  changeEmailAction,
  changePasswordAction,
  deleteAccountAction,
  sendReauthCodeAction,
  signOutEverywhereAction,
  signOutOtherDevicesAction,
} from "@/features/auth/actions"
import { copy } from "@/lib/copy"
import type { Lang } from "@/lib/i18n"

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section className="border border-[color:var(--soc-hairline)] bg-card p-4 sm:p-5">
      <h2 className="text-[15px] font-medium text-fg">{title}</h2>
      {hint ? <p className="mt-1 text-[13px] leading-snug text-muted">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function AccountSecurity({
  lang,
  email,
  provider,
  lastSignInAt,
}: {
  lang: Lang
  email: string
  provider: string
  lastSignInAt: string | null
}) {
  const isPasswordAccount = provider === "email"
  const [nonce, setNonce] = useState("")

  const [reauthState, reauthAction, reauthPending] = useActionState(sendReauthCodeAction, null)
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null)
  const [emailState, emailAction, emailPending] = useActionState(changeEmailAction, null)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccountAction, null)

  function reauthFields(prefix: string) {
    return (
      <>
        <input type="hidden" name="lang" value={lang} />
        {isPasswordAccount ? (
          <Input
            id={`${prefix}-current-password`}
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            appearance="social"
            label={copy.currentPasswordLabel[lang]}
          />
        ) : (
          <Input
            id={`${prefix}-nonce`}
            name="nonce"
            type="text"
            required
            value={nonce}
            onChange={(event) => setNonce(event.target.value)}
            autoComplete="one-time-code"
            appearance="social"
            label={copy.reauthNonceLabel[lang]}
            hint={copy.reauthNonceHint[lang]}
          />
        )}
      </>
    )
  }

  return (
    <div className="grid gap-6">
      <Section title={copy.accountSecurityTitle[lang]} hint={copy.accountSecurityIntro[lang]}>
        {!isPasswordAccount ? (
          <form action={reauthAction} className="mb-4 grid gap-2">
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              disabled={reauthPending}
              className={socialButtonClass({ variant: "soft", size: "sm" })}
            >
              {reauthPending ? copy.reauthSending[lang] : copy.reauthSend[lang]}
            </button>
            {reauthState && "ok" in reauthState ? (
              <Alert tone="info" flat>
                {copy.reauthSent[lang]}
              </Alert>
            ) : null}
            {reauthState && "error" in reauthState ? (
              <Alert tone="error" flat>
                {copy.errors[reauthState.error][lang]}
              </Alert>
            ) : null}
          </form>
        ) : null}

        <div className="grid gap-6">
          <form action={passwordAction} className="grid gap-4">
            {reauthFields("password")}
            <Input
              id="newPassword"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              appearance="social"
              label={copy.newPasswordLabel[lang]}
            />
            <Input
              appearance="social"
              id="confirmPassword"
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              label={copy.confirmPasswordLabel[lang]}
            />
            <div>
              <button
                type="submit"
                disabled={passwordPending}
                aria-busy={passwordPending || undefined}
                className={socialButtonClass({ variant: "solid", size: "md" })}
              >
                {passwordPending ? copy.passwordChanging[lang] : copy.passwordChangeSubmit[lang]}
              </button>
            </div>
            {passwordState && "error" in passwordState ? (
              <Alert tone="error" flat>
                {copy.errors[passwordState.error][lang]}
              </Alert>
            ) : null}
            {passwordState && "ok" in passwordState ? (
              <Alert tone="info" flat>
                {copy.passwordChanged[lang]}
              </Alert>
            ) : null}
          </form>

          <form action={emailAction} className="grid gap-4 border-t border-[color:var(--soc-hairline)] pt-6">
            <h3 className="text-[14px] font-medium text-fg">{copy.emailChangeTitle[lang]}</h3>
            <p className="text-[13px] leading-relaxed text-muted">{copy.emailChangeHint[lang]}</p>
            {reauthFields("email")}
            <Input
              id="newEmail"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={email}
              appearance="social"
              label={copy.newEmailLabel[lang]}
            />
            <div>
              <button
                type="submit"
                disabled={emailPending}
                aria-busy={emailPending || undefined}
                className={socialButtonClass({ variant: "soft", size: "md" })}
              >
                {emailPending ? copy.emailChanging[lang] : copy.emailChangeSubmit[lang]}
              </button>
            </div>
            {emailState && "error" in emailState ? (
              <Alert tone="error" flat>
                {copy.errors[emailState.error][lang]}
              </Alert>
            ) : null}
            {emailState && "ok" in emailState ? (
              <Alert tone="info" flat>
                {copy.emailChangeSentGeneric[lang]}
              </Alert>
            ) : null}
          </form>
        </div>
      </Section>

      <Section title={copy.sessionsTitle[lang]} hint={copy.sessionsHint[lang]}>
        <dl className="grid gap-2 text-[13px]">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">{copy.sessionCurrent[lang]}</dt>
            <dd className="text-fg">{email}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted">{copy.sessionProvider[lang]}</dt>
            <dd className="text-fg">{provider}</dd>
          </div>
          {lastSignInAt ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted">{copy.sessionSignedIn[lang]}</dt>
              <dd className="text-fg">{lastSignInAt.slice(0, 10)}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <form action={signOutOtherDevicesAction}>
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className={socialButtonClass({ variant: "soft", size: "sm" })}>
              {copy.sessionOtherDevicesAction[lang]}
            </button>
          </form>
          <form action={signOutEverywhereAction}>
            <input type="hidden" name="lang" value={lang} />
            <button type="submit" className={socialButtonClass({ variant: "ghost", size: "sm" })}>
              {copy.sessionAllDevicesAction[lang]}
            </button>
          </form>
        </div>
      </Section>

      <Section title={copy.deleteAccountTitle[lang]} hint={copy.deleteAccountHint[lang]}>
        <form action={deleteAction} className="grid gap-4">
          {reauthFields("delete")}
          <Input
            id="deleteConfirm"
            name="confirm"
            type="text"
            required
            appearance="social"
            label={copy.deleteAccountConfirmLabel[lang]}
            hint={copy.deleteAccountWarning[lang]}
          />
          <div>
            <button
              type="submit"
              disabled={deletePending}
              aria-busy={deletePending || undefined}
              className={socialButtonClass({ variant: "soft", size: "md" })}
            >
              {deletePending ? copy.deleteAccountBusy[lang] : copy.deleteAccountSubmit[lang]}
            </button>
          </div>
          {deleteState && "error" in deleteState ? (
            <Alert tone="error" flat>
              {copy.errors[deleteState.error][lang]}
            </Alert>
          ) : null}
        </form>
      </Section>
    </div>
  )
}
