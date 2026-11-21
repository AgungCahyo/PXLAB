import { z } from "zod"
import { isStrongPassword } from "@/lib/validations/password"

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/

export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "commons",
  "create",
  "dashboard",
  "explore",
  "login",
  "me",
  "pxlb",
  "register",
  "settings",
  "space",
  "thecommons",
  "u",
  "welcome",
] as const

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "username_format")
  .refine((value) => !RESERVED_USERNAMES.includes(value as (typeof RESERVED_USERNAMES)[number]), {
    message: "username_reserved",
  })

export const displayNameSchema = z.string().trim().min(1).max(50)
export const bioSchema = z.string().trim().max(280)
export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine(isStrongPassword, "password_weak")
export const emailSchema = z.string().trim().email()

/** Credentials only — identity is collected on /welcome. */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const profileUpdateSchema = z
  .object({
    username: usernameSchema,
    displayName: displayNameSchema,
    bio: bioSchema.optional().or(z.literal("")),
  })
  .strict()

export function parseProfileUpdate(input: unknown) {
  const parsed = profileUpdateSchema.safeParse(input)
  if (!parsed.success) return parsed
  if ("role" in (input as object)) {
    return { success: false as const, error: "role_forbidden" }
  }
  return parsed
}
