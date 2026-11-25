"use client"

import { useActionState, useState, type ReactNode } from "react"
import {
  KeyRound,
  MonitorSmartphone,
  Trash2,
} from "lucide-react"
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
import { copy } from "../../lib/copy"
import type { Lang } from "@/lib/i18n"

// ─── Primitives ───────────────────────────────────────────────────────────────

function SecurityCard({
  icon,
  title,
  description,
  children,
  danger = false,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${
        danger ? "border-red-200/80" : "border-slate-200/80"
      }`}
    >
      {/* Card header */}
      <div
        className={`flex items-start gap-3 px-5 py-4 sm:px-6 ${
          danger ? "border-b border-red-100 bg-red-50/40" : "border-b border-slate-100 bg-slate-50/60"
        }`}
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-red-100 text-red-500" : "bg-[#6355d8]/10 text-[#6355d8]"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            className={`text-[14px] font-semibold ${danger ? "text-red-700" : "text-fg"}`}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {/* Card body */}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  )
}

function FormRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-4">{children}</div>
}

function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 pt-2">{children}</div>
}

function SessionItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-right text-[13px] font-medium text-fg">{value}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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
            label={copy.reauthNonceLabel[lang]}
            hint={copy.reauthNonceHint[lang]}
          />
        )}
      </>
    )
  }

  return (
    <div className="grid gap-5">
      {/* ── Password & Credentials ────────────────────────── */}
      <SecurityCard
        icon={<KeyRound className="size-4" strokeWidth={2.5} />}
        title={copy.accountSecurityTitle[lang]}
        description={copy.accountSecurityIntro[lang]}
      >
        {/* OAuth: send one-time code first */}
        {!isPasswordAccount ? (
          <form action={reauthAction} className="mb-6 pb-6 border-b border-slate-100">
            <input type="hidden" name="lang" value={lang} />
            <p className="mb-3 text-[13px] leading-relaxed text-muted">
              {copy.reauthNonceHint[lang]}
            </p>
            <button
              type="submit"
              disabled={reauthPending}
              className={socialButtonClass({ variant: "soft", size: "sm" })}
            >
              {reauthPending ? copy.reauthSending[lang] : copy.reauthSend[lang]}
            </button>
            {reauthState && "ok" in reauthState ? (
              <div className="mt-3">
                <Alert tone="info" flat>{copy.reauthSent[lang]}</Alert>
              </div>
            ) : null}
            {reauthState && "error" in reauthState ? (
              <div className="mt-3">
                <Alert tone="error" flat>{copy.errors[reauthState.error][lang]}</Alert>
              </div>
            ) : null}
          </form>
        ) : null}

        <div className="grid gap-8">
          {/* Change password */}
          <form action={passwordAction}>
            <FormRow>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
                {lang === "id" ? "Ganti kata sandi" : "Change password"}
              </h3>
              {reauthFields("password")}
              <Input
                id="newPassword"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                label={copy.newPasswordLabel[lang]}
              />
              <Input
                id="confirmPassword"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                label={copy.confirmPasswordLabel[lang]}
              />
              <ActionBar>
                <button
                  type="submit"
                  disabled={passwordPending}
                  aria-busy={passwordPending || undefined}
                  className={socialButtonClass({ variant: "solid", size: "md" })}
                >
                  {passwordPending ? copy.passwordChanging[lang] : copy.passwordChangeSubmit[lang]}
                </button>
              </ActionBar>
              {passwordState && "error" in passwordState ? (
                <Alert tone="error" flat>{copy.errors[passwordState.error][lang]}</Alert>
              ) : null}
              {passwordState && "ok" in passwordState ? (
                <Alert tone="info" flat>{copy.passwordChanged[lang]}</Alert>
              ) : null}
            </FormRow>
          </form>

          {/* Change email */}
          <form action={emailAction}>
            <FormRow>
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-muted">
                {copy.emailChangeTitle[lang]}
              </h3>
              <p className="text-[13px] leading-relaxed text-muted">
                {copy.emailChangeHint[lang]}
              </p>
              {reauthFields("email")}
              <Input
                id="newEmail"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={email}
                label={copy.newEmailLabel[lang]}
              />
              <ActionBar>
                <button
                  type="submit"
                  disabled={emailPending}
                  aria-busy={emailPending || undefined}
                  className={socialButtonClass({ variant: "soft", size: "md" })}
                >
                  {emailPending ? copy.emailChanging[lang] : copy.emailChangeSubmit[lang]}
                </button>
              </ActionBar>
              {emailState && "error" in emailState ? (
                <Alert tone="error" flat>{copy.errors[emailState.error][lang]}</Alert>
              ) : null}
              {emailState && "ok" in emailState ? (
                <Alert tone="info" flat>{copy.emailChangeSentGeneric[lang]}</Alert>
              ) : null}
            </FormRow>
          </form>
        </div>
      </SecurityCard>

      {/* ── Sessions ──────────────────────────────────────── */}
      <SecurityCard
        icon={<MonitorSmartphone className="size-4" strokeWidth={2.5} />}
        title={copy.sessionsTitle[lang]}
        description={copy.sessionsHint[lang]}
      >
        {/* Session info */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60">
          <div className="divide-y divide-slate-100 px-4">
            <SessionItem label={copy.sessionCurrent[lang]} value={email} />
            <SessionItem label={copy.sessionProvider[lang]} value={provider} />
            {lastSignInAt ? (
              <SessionItem
                label={copy.sessionSignedIn[lang]}
                value={lastSignInAt.slice(0, 10)}
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={signOutOtherDevicesAction}>
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              className={socialButtonClass({ variant: "soft", size: "sm" })}
            >
              <MonitorSmartphone className="size-4" />
              {copy.sessionOtherDevicesAction[lang]}
            </button>
          </form>
          <form action={signOutEverywhereAction}>
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              className={socialButtonClass({ variant: "ghost", size: "sm" })}
            >
              {copy.sessionAllDevicesAction[lang]}
            </button>
          </form>
        </div>
      </SecurityCard>

      {/* ── Danger zone — Delete account ──────────────────── */}
      <SecurityCard
        icon={<Trash2 className="size-4" strokeWidth={2.5} />}
        title={copy.deleteAccountTitle[lang]}
        description={copy.deleteAccountHint[lang]}
        danger
      >
        <form action={deleteAction}>
          <FormRow>
            {reauthFields("delete")}
            <Input
              id="deleteConfirm"
              name="confirm"
              type="text"
              required
              label={copy.deleteAccountConfirmLabel[lang]}
              hint={copy.deleteAccountWarning[lang]}
            />
            <ActionBar>
              <button
                type="submit"
                disabled={deletePending}
                aria-busy={deletePending || undefined}
                className={socialButtonClass({ variant: "ghost", size: "md" })}
              >
                {deletePending ? copy.deleteAccountBusy[lang] : copy.deleteAccountSubmit[lang]}
              </button>
            </ActionBar>
            {deleteState && "error" in deleteState ? (
              <Alert tone="error" flat>{copy.errors[deleteState.error][lang]}</Alert>
            ) : null}
          </FormRow>
        </form>
      </SecurityCard>
    </div>
  )
}
