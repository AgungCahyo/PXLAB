export type AuthErrorCode =
  | "generic_auth"
  | "generic_register"
  | "invalid_input"
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
  const mapped = mapAuthError(error)
  if (mapped === "username_taken" || mapped === "username_format") return mapped
  return "generic_register"
}
