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
  | "password_mismatch"
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

export function mapLoginError(error: { message?: string; code?: string } | null | undefined): AuthErrorCode {
  const message = (error?.message ?? "").toLowerCase()
  const code = (error?.code ?? "").toLowerCase()
  // Only after credentials resolve to an account — does not leak existence on wrong password.
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "email_not_confirmed"
  }
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

export function mapRegisterError(error: { message?: string; code?: string } | null | undefined): AuthErrorCode {
  const message = (error?.message ?? "").toLowerCase()
  const code = (error?.code ?? "").toLowerCase()
  if (
    code === "user_already_exists" ||
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return "email_taken"
  }
  const mapped = mapAuthError(error)
  if (mapped === "username_taken" || mapped === "username_format") return mapped
  return "generic_register"
}
