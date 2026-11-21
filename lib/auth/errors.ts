export type AuthErrorCode =
  | "generic_auth"
  | "generic_register"
  | "email_not_confirmed"
  | "email_taken"
  | "oauth_failed"
  | "oauth_email_conflict"
  | "invalid_input"
  | "invalid_email"
  | "invalid_password"
  | "password_weak"
  | "password_mismatch"
  | "invalid_current_password"
  | "reauth_required"
  | "reauth_failed"
  | "email_unchanged"
  | "email_change_failed"
  | "account_delete_failed"
  | "username_taken"
  | "username_format"
  | "username_reserved"
  | "not_authenticated"
  | "forbidden"
  | "not_configured"
  | "payload_too_large"
  | "limit_reached"
  | "not_found"
  | "title_required"

export type AuthField = "email" | "password" | "username" | "displayName"

export function mapLoginError(
  error: { message?: string; code?: string } | null | undefined,
): AuthErrorCode {
  // Supabase can report `email_not_confirmed`, which would reveal that the
  // address exists. Every failed sign-in answers the same way (LOG-01); an
  // unconfirmed owner is nudged by the generic resend-verification form.
  void error
  return "generic_auth"
}

export function mapAuthError(error: { message?: string; code?: string } | null | undefined): AuthErrorCode {
  const message = (error?.message ?? "").toLowerCase()
  const code = (error?.code ?? "").toLowerCase()

  if (code.includes("23505") || message.includes("duplicate") || message.includes("already exists")) {
    return "username_taken"
  }
  if (message.includes("profiles_username_format") || message.includes("username_format")) {
    return "username_format"
  }
  return "generic_auth"
}

export type SignupConflict = "duplicate" | "oauth"

/**
 * Detects an existing account behind a signup attempt, including accounts
 * originally created by an OAuth provider. Used only to pick the follow-up
 * email — the UI response stays generic for anti-enumeration.
 */
export function classifySignupConflict(
  error: { message?: string; code?: string } | null | undefined,
): SignupConflict | null {
  const message = (error?.message ?? "").toLowerCase()
  const code = (error?.code ?? "").toLowerCase()
  const duplicate =
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists") ||
    message.includes("email address is already") ||
    (message.includes("already exists") && message.includes("email"))

  if (!duplicate) return null
  if (
    message.includes("oauth") ||
    message.includes("google") ||
    message.includes("provider") ||
    message.includes("identity") ||
    message.includes("sign-in method") ||
    message.includes("linked")
  ) {
    return "oauth"
  }
  return "duplicate"
}

export function mapRegisterError(error: { message?: string; code?: string } | null | undefined): AuthErrorCode {
  if (classifySignupConflict(error)) return "generic_register"
  const mapped = mapAuthError(error)
  if (mapped === "username_taken" || mapped === "username_format") return mapped
  return "generic_register"
}
