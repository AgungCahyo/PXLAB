"use client"

import { useActionState, useState, type ReactNode } from "react"
import { ChevronRight, KeyRound, Mail, MonitorSmartphone, Trash2 } from "lucide-react"
import { socialButtonClass } from "@/components/social/socialButton"
import { Alert } from "@/components/ui/Alert"
import { Dialog } from "@/components/ui/Dialog"
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

type SecurityModal = "password" | "email" | "delete" | null

function errorText(code: string | undefined, lang: Lang): string | null {
  if (!code) return null
  const table = copy.errors as Record<string, Record<Lang, string> | undefined>
  return table[code]?.[lang] ?? code
}

function formatSignIn(value: string | null, lang: Lang): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function SecurityCard({
  icon,
  title,
  hint,
  danger = false,
  children,
}: {
  icon: ReactNode
  title: string
  hint?: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={
        danger
          ? "border border-brick/35 bg-card"
          : "border border-line bg-card"
      }
    >
      <header className="flex items-start gap-3 border-b border-line bg-soft px-4 py-3.5 sm:px-5">
        <span
          className={`mt-0.5 shrink-0 ${danger ? "text-brick" : "text-muted"}`}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={`text-[15px] font-semibold tracking-tight ${danger ? "text-brick" : "text-fg"}`}>
            {title}
          </h3>
          {hint ? <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{hint}</p> : null}
        </div>
      </header>
      <div>{children}</div>
    </section>
  )
}

function SecurityActionRow({
  icon,
  title,
  description,
  danger = false,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 border-b border-line px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${danger ? "text-brick" : "text-muted"}`} aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <p className={`text-[14px] font-medium ${danger ? "text-brick" : "text-fg"}`}>{title}</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    </button>
  )
}

function SessionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-2.5 text-[13px] last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="truncate font-mono text-[12px] text-fg">{value}</span>
    </div>
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
  const [activeModal, setActiveModal] = useState<SecurityModal>(null)
  const [nonce, setNonce] = useState("")

  const [reauthState, reauthAction, reauthPending] = useActionState(sendReauthCodeAction, null)
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, null)
  const [emailState, emailAction, emailPending] = useActionState(changeEmailAction, null)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteAccountAction, null)

  const modalBusy = passwordPending || emailPending || deletePending || reauthPending
  const closeModal = () => {
    if (!modalBusy) setActiveModal(null)
  }

  const reauthSection = (idPrefix: string) =>
    isPasswordAccount ? (
      <label className="block space-y-1.5" htmlFor={`${idPrefix}-current-password`}>
        <span className="block text-[13px] font-medium text-fg">
          {copy.currentPasswordLabel[lang]}
        </span>
        <Input
          id={`${idPrefix}-current-password`}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-[2px] border-line bg-bg"
        />
      </label>
    ) : (
      <div className="space-y-3">
        <div className="border border-line bg-soft p-3.5">
          <p className="text-[13px] leading-relaxed text-muted">{copy.reauthNonceHint[lang]}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={reauthPending}
              onClick={() => {
                const formData = new FormData()
                formData.set("lang", lang)
                reauthAction(formData)
              }}
              className={socialButtonClass({ variant: "soft", size: "sm" })}
            >
              {reauthPending ? copy.reauthSending[lang] : copy.reauthSend[lang]}
            </button>
            {reauthState && "reauthSent" in reauthState && reauthState.reauthSent ? (
              <span className="text-[12px] font-medium text-fg">{copy.reauthSent[lang]}</span>
            ) : null}
          </div>
          {reauthState && "error" in reauthState && reauthState.error ? (
            <p className="mt-2 text-[12px] text-brick">
              {errorText(reauthState.error, lang)}
            </p>
          ) : null}
        </div>

        <label className="block space-y-1.5" htmlFor={`${idPrefix}-nonce`}>
          <span className="block text-[13px] font-medium text-fg">
            {copy.reauthNonceLabel[lang]}
          </span>
          <Input
            id={`${idPrefix}-nonce`}
            name="nonce"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={nonce}
            onChange={(event) => setNonce(event.target.value)}
            className="rounded-[2px] border-line bg-bg font-mono"
          />
        </label>
      </div>
    )

  const passwordError =
    passwordState && "error" in passwordState ? errorText(passwordState.error, lang) : null
  const passwordDone =
    passwordState && "passwordChanged" in passwordState && passwordState.passwordChanged

  const emailError =
    emailState && "error" in emailState ? errorText(emailState.error, lang) : null
  const emailDone =
    emailState && "emailChangeSent" in emailState && emailState.emailChangeSent

  const deleteError =
    deleteState && "error" in deleteState ? errorText(deleteState.error, lang) : null

  return (
    <div className="space-y-6">
      <SecurityCard
        icon={<KeyRound className="h-4 w-4" />}
        title={copy.accountSecurityTitle[lang]}
        hint={copy.accountSecurityIntro[lang]}
      >
        <SecurityActionRow
          icon={<KeyRound className="h-4 w-4" />}
          title={copy.passwordChangeSubmit[lang]}
          description={
            lang === "id"
              ? "Perbarui kata sandi akun Anda."
              : "Update your account password."
          }
          onClick={() => setActiveModal("password")}
        />
        <SecurityActionRow
          icon={<Mail className="h-4 w-4" />}
          title={copy.emailChangeTitle[lang]}
          description={
            email
              ? lang === "id"
                ? `Email saat ini: ${email}`
                : `Current email: ${email}`
              : copy.emailChangeHint[lang]
          }
          onClick={() => setActiveModal("email")}
        />
      </SecurityCard>

      <SecurityCard
        icon={<MonitorSmartphone className="h-4 w-4" />}
        title={copy.sessionsTitle[lang]}
        hint={copy.sessionsHint[lang]}
      >
        <div className="px-4 py-3.5 sm:px-5">
          <div className="divide-y divide-line border-b border-line pb-1">
            <SessionItem label={copy.sessionCurrent[lang]} value={email || "—"} />
            <SessionItem label={copy.sessionProvider[lang]} value={provider || "email"} />
            <SessionItem
              label={copy.sessionSignedIn[lang]}
              value={formatSignIn(lastSignInAt, lang)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <form action={signOutOtherDevicesAction}>
              <input type="hidden" name="lang" value={lang} />
              <button
                type="submit"
                className={socialButtonClass({ variant: "soft", size: "sm" })}
              >
                {copy.sessionOtherDevicesAction[lang]}
              </button>
            </form>
            <form action={signOutEverywhereAction}>
              <input type="hidden" name="lang" value={lang} />
              <button
                type="submit"
                className={socialButtonClass({ variant: "soft", size: "sm" })}
              >
                {copy.sessionAllDevicesAction[lang]}
              </button>
            </form>
          </div>
        </div>
      </SecurityCard>

      <SecurityCard
        icon={<Trash2 className="h-4 w-4" />}
        title={lang === "id" ? "Penghapusan akun" : "Account deletion"}
      >
        <SecurityActionRow
          icon={<Trash2 className="h-4 w-4" />}
          title={copy.deleteAccountTitle[lang]}
          description={copy.deleteAccountHint[lang]}
          danger
          onClick={() => setActiveModal("delete")}
        />
      </SecurityCard>

      <Dialog
        open={activeModal === "password"}
        onClose={closeModal}
        title={copy.passwordChangeSubmit[lang]}
        closeLabel={copy.closeMenu[lang]}
        tone="social"
        size="md"
      >
        <form action={passwordAction} className="space-y-4">
          <input type="hidden" name="lang" value={lang} />

          {reauthSection("pw")}

          <label className="block space-y-1.5" htmlFor="pw-new">
            <span className="block text-[13px] font-medium text-fg">
              {copy.newPasswordLabel[lang]}
            </span>
            <Input
              id="pw-new"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="rounded-[2px] border-line bg-bg"
            />
          </label>

          <label className="block space-y-1.5" htmlFor="pw-confirm">
            <span className="block text-[13px] font-medium text-fg">
              {copy.confirmPasswordLabel[lang]}
            </span>
            <Input
              id="pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="rounded-[2px] border-line bg-bg"
            />
          </label>

          {passwordError ? (
            <Alert flat tone="error">
              {passwordError}
            </Alert>
          ) : null}

          {passwordDone ? (
            <Alert flat tone="info">
              {copy.passwordChanged[lang]}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={modalBusy}
              className={socialButtonClass({ variant: "soft", size: "md" })}
            >
              {copy.createCancel[lang]}
            </button>
            <button
              type="submit"
              disabled={passwordPending}
              className={socialButtonClass({ variant: "solid", size: "md" })}
            >
              {passwordPending ? copy.passwordChanging[lang] : copy.passwordChangeSubmit[lang]}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={activeModal === "email"}
        onClose={closeModal}
        title={copy.emailChangeTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
        tone="social"
        size="md"
      >
        <form action={emailAction} className="space-y-4">
          <input type="hidden" name="lang" value={lang} />

          <div className="border border-line bg-soft px-3.5 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
              {lang === "id" ? "Email saat ini" : "Current email"}
            </p>
            <p className="mt-0.5 break-all font-mono text-[13px] text-fg">{email || "—"}</p>
          </div>

          <p className="text-[13px] leading-relaxed text-muted">{copy.emailChangeHint[lang]}</p>

          {reauthSection("email")}

          <label className="block space-y-1.5" htmlFor="email-next">
            <span className="block text-[13px] font-medium text-fg">
              {copy.newEmailLabel[lang]}
            </span>
            <Input
              id="email-next"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-[2px] border-line bg-bg"
            />
          </label>

          {emailError ? (
            <Alert flat tone="error">
              {emailError}
            </Alert>
          ) : null}

          {emailDone ? (
            <Alert flat tone="info">
              {copy.emailChangeSentGeneric[lang]}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={modalBusy}
              className={socialButtonClass({ variant: "soft", size: "md" })}
            >
              {copy.createCancel[lang]}
            </button>
            <button
              type="submit"
              disabled={emailPending}
              className={socialButtonClass({ variant: "solid", size: "md" })}
            >
              {emailPending ? copy.emailChanging[lang] : copy.emailChangeSubmit[lang]}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={activeModal === "delete"}
        onClose={closeModal}
        title={copy.deleteAccountTitle[lang]}
        closeLabel={copy.closeMenu[lang]}
        tone="social"
        size="md"
      >
        <form action={deleteAction} className="space-y-4">
          <input type="hidden" name="lang" value={lang} />

          <div className="flex items-start gap-3 border border-brick/40 bg-soft p-3.5">
            <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-brick" aria-hidden="true" />
            <div className="space-y-1 text-[13px] leading-relaxed">
              <p className="font-medium text-fg">{copy.deleteAccountWarning[lang]}</p>
              <p className="text-muted">{copy.deleteAccountHint[lang]}</p>
            </div>
          </div>

          {reauthSection("delete")}

          <label className="block space-y-1.5" htmlFor="delete-confirm">
            <span className="block text-[13px] font-medium text-fg">
              {copy.deleteAccountConfirmLabel[lang]}
            </span>
            <Input
              id="delete-confirm"
              name="confirm"
              type="text"
              autoComplete="off"
              placeholder="DELETE"
              required
              className="rounded-[2px] border-line bg-bg font-mono"
            />
          </label>

          {deleteError ? (
            <Alert flat tone="error">
              {deleteError}
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-4">
            <button
              type="button"
              onClick={closeModal}
              disabled={modalBusy}
              className={socialButtonClass({ variant: "soft", size: "md" })}
            >
              {copy.createCancel[lang]}
            </button>
            <button
              type="submit"
              disabled={deletePending}
              className={socialButtonClass({
                variant: "solid",
                size: "md",
                className: "border-brick bg-brick text-white hover:border-brick hover:opacity-90",
              })}
            >
              {deletePending ? copy.deleteAccountBusy[lang] : copy.deleteAccountSubmit[lang]}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
