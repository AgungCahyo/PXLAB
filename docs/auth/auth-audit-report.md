# PXLB Authentication System — Phase 1 Audit Report

## A. Executive Summary

The PXLB authentication system is a modern Next.js 15 application using Supabase Auth with email/password and Google OAuth. The system implements a unique two-phase onboarding flow where identity (username/display name) is collected after authentication via `/welcome`.

**Overall Health**: Good foundation with solid architectural decisions, but several critical security issues and UX gaps exist.

**Major Concerns**:
1. **Critical**: Password recovery flow allows session hijacking — a valid Supabase session from a recovery link bypasses password reset and grants full authenticated access
2. **High**: No rate limiting on auth endpoints (registration, login, password reset, resend verification)
3. **High**: No CSRF protection on server actions
4. **Medium**: Duplicate email handling on registration leaks account existence via error messages
5. **Medium**: No re-authentication for sensitive operations (password change, email change, account deletion)
6. **Low**: Missing session revocation / logout from all devices

---

## B. Existing Architecture

### Authentication Flow Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Register  │────▶│  Email      │────▶│   /welcome  │────▶│  Dashboard  │
│  (email/    │     │  Verify     │     │  (username, │     │             │
│   password) │     │             │     │  display,   │     │             │
└─────────────┘     └─────────────┘     │  avatar)    │     └─────────────┘
       │                                    └─────────────┘
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Login    │────▶│  Session    │────▶│  Dashboard  │
│  (email/    │     │  Created    │     │  (or /welcome│
│   password) │     │             │     │   if new)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Forgot     │────▶│   Reset     │────▶│   Update    │────▶│    Login    │
│  Password   │     │  Password   │     │  Password   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Key Files and Responsibilities

| File | Responsibility |
|------|----------------|
| `app/[lang]/(auth)/login/page.tsx` | Login page (SSR), redirects authenticated users |
| `app/[lang]/(auth)/register/page.tsx` | Registration page (SSR), redirects authenticated users |
| `app/[lang]/(auth)/forgot-password/page.tsx` | Forgot password page (SSR) |
| `app/[lang]/(auth)/reset-password/page.tsx` | Reset password page (SSR), checks session |
| `app/auth/callback/route.ts` | OAuth & email verification callback handler |
| `features/auth/actions.ts` | All server actions (register, login, logout, reset, update password) |
| `lib/auth/session.ts` | Server-side session/profile utilities |
| `lib/supabase/server.ts` | Server Supabase client (with cookies) |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/middleware.ts` | Middleware for session refresh |
| `middleware.ts` | Next.js middleware (runs `updateSession`) |
| `components/auth/*.tsx` | Client components (forms, Google button, logout) |
| `components/profiles/WelcomeForm.tsx` | Onboarding form (avatar + identity) |
| `features/profiles/actions.ts` | Profile/onboarding server actions |
| `supabase/migrations/*.sql` | Database schema, triggers, RLS policies |

### Supabase Client Architecture

Three client types serve different purposes:
1. **Server Client** (`createServerSupabase`) — Server Components, Actions; uses cookies for session
2. **Browser Client** (`createBrowserSupabase`) — Client Components; uses localStorage
3. **Public Client** (`createPublicSupabase`) — Public reads only; no session persistence

### Database Schema (Profiles)

```sql
profiles:
  id (uuid, PK, FK → auth.users)
  username (text, nullable, unique when not null)
  display_name (text, nullable)
  bio (text, nullable)
  avatar_url (text, nullable)
  avatar_config (jsonb, nullable)
  role (text, 'member'|'admin', default 'member')
  created_at, updated_at, onboarding_completed_at (timestamptz)
```

**Trigger**: `handle_new_user()` on `auth.users` insert creates profile with `username=null`, `onboarding_completed_at=null`.

---

## C. Findings

### Registration System

| ID | Severity | Category | File | Current Behavior | Expected Behavior | Root Cause | Recommendation |
|----|----------|----------|------|------------------|-------------------|------------|----------------|
| REG-01 | High | Registration | `features/auth/actions.ts:59-93` | Duplicate email returns `email_taken` error | Generic "check email" message (anti-enumeration) | `mapRegisterError` maps `user_already_exists` to `email_taken` | Return generic success; send "sign in instead" email to existing account |
| REG-02 | Medium | Registration | `features/auth/actions.ts:87-91` | If session exists after signup, redirects to dashboard | Should redirect to `/welcome` for new users | `data.session` exists when email confirmation disabled | Always redirect to `/welcome` for new registrations |
| REG-03 | Low | Registration | `lib/validations/profile.ts:35` | Password min 8, max 72 chars | Consider strength requirements | No complexity rules | Add zxcvbn or similar for password strength |
| REG-04 | Medium | Registration | `features/auth/actions.ts:95-116` | Resend verification always succeeds (anti-enumeration) ✓ | Good — maintains anti-enumeration | N/A | Keep current behavior |
| REG-05 | Low | Registration | `app/auth/callback/route.ts` | OAuth email conflict detected but not for email/password | Consistent conflict handling | OAuth uses callback; email/password uses action | Add email conflict detection to registration action |

### Login System

| ID | Severity | Category | File | Current Behavior | Expected Behavior | Root Cause | Recommendation |
|----|----------|----------|------|------------------|-------------------|------------|----------------|
| LOG-01 | Medium | Login | `features/auth/actions.ts:138-164` | `email_not_confirmed` error shown distinctly | Generic "invalid credentials" (anti-enumeration) | `mapLoginError` returns specific code for unconfirmed email | Return `generic_auth` for all failures; handle unconfirmed via resend flow |
| LOG-02 | Low | Login | `lib/supabase/middleware.ts` | Session refreshed on every request ✓ | Good | N/A | Keep |
| LOG-03 | Medium | Login | `features/auth/actions.ts:161-163` | Redirects to `/welcome` if `onboarding_completed_at` null ✓ | Good | Uses `postAuthPath` | Keep |
| LOG-04 | Low | Login | `app/[lang]/(auth)/login/page.tsx:41-42` | Checks profile on page load, redirects if authenticated ✓ | Good | SSR check | Keep |
| LOG-05 | Medium | Login | N/A | No rate limiting on login attempts | Should implement rate limiting | Missing middleware/edge function | Add rate limiting via middleware or Supabase config |
| LOG-06 | Low | Login | N/A | No "remember me" / extended session option | Optional extended session | Not implemented | Add `session_duration` option to signIn |

### Password Recovery (Critical Area)

| ID | Severity | Category | File | Current Behavior | Expected Behavior | Root Cause | Recommendation |
|----|----------|----------|------|------------------|-------------------|------------|----------------|
| REC-01 | **Critical** | Recovery | `features/auth/actions.ts:166-186` + `app/auth/callback/route.ts` | Recovery link creates valid session via `exchangeCodeForSession` → user lands on `/reset-password` with full auth session | Recovery link should ONLY authorize password reset, NOT create a full authenticated session | `exchangeCodeForSession` creates a normal session; reset page only checks `getSessionUserId()` | Use `supabase.auth.exchangeCodeForSession` but verify `type=recovery` in session; store recovery token in server-side state; validate on reset page |
| REC-02 | High | Recovery | `app/[lang]/(auth)/reset-password/page.tsx:43` | Checks `getSessionUserId()` — ANY valid session allows password change | Should verify recovery context (not just any session) | No distinction between recovery session and normal session | Add recovery-specific session validation (check `auth_event` or store recovery token) |
| REC-03 | High | Recovery | `features/auth/actions.ts:188-214` | `updatePasswordAction` only checks `getSessionUserId()` | Must verify recovery authorization | Same as REC-02 | Require recovery token/nonce validation before password update |
| REC-04 | Medium | Recovery | `features/auth/actions.ts:179-183` | `resetPasswordForEmail` redirects to `/auth/callback?next=/reset-password` | Should use dedicated recovery redirect | Generic callback handles all auth types | Create dedicated recovery callback or pass `type=recovery` |
| REC-05 | Medium | Recovery | N/A | No expiration/reuse validation on recovery links | Expired/reused links should fail | Supabase handles token expiry but not reuse tracking | Track used recovery tokens server-side |
| REC-06 | Medium | Recovery | `app/[lang]/(auth)/reset-password/page.tsx:51-62` | Shows warning if no session but allows access via direct URL | Should 404/redirect if no recovery context | Only checks session existence | Gate page access with recovery token validation |

### Email Verification

| ID | Severity | Category | File | Current Behavior | Expected Behavior | Root Cause | Recommendation |
|----|----------|----------|------|------------------|-------------------|------------|----------------|
| VER-01 | Low | Verification | `app/auth/callback/route.ts` | Handles email verification via `code` param ✓ | Good | Supabase handles verification | Keep |
| VER-02 | Medium | Verification | `features/auth/actions.ts:95-116` | Resend verification always succeeds ✓ | Good (anti-enumeration) | Intentional design | Keep |
| VER-03 | Low | Verification | N/A | No handling for expired verification links | Should show friendly error | Supabase returns error on expired | Add expired link detection in callback |
| VER-04 | Low | Verification | `app/[lang]/(auth)/login/page.tsx:42` | Redirects unverified users? No — `email_not_confirmed` shown on login | Should redirect unverified to verification page | Login shows error but doesn't redirect | Add redirect to verification-resend page |

### Account Security

| ID | Severity | Category | File | Current Behavior | Expected Behavior | Root Cause | Recommendation |
|----|----------|----------|------|------------------|-------------------|------------|----------------|
| SEC-01 | High | Security | N/A | No re-authentication for password change | Require current password | Missing feature | Add re-auth gate to `updatePasswordAction` |
| SEC-02 | High | Security | N/A | No email change flow | Secure email change with verification | Not implemented | Implement email change with verification to new email |
| SEC-03 | High | Security | `components/auth/LogoutButton.tsx` | Logout only signs out current session | "Logout from all devices" option | `signOut()` only revokes current session | Add `signOut({ scope: 'global' })` option |
| SEC-04 | High | Security | N/A | No account deletion | Account deletion with re-auth | Not implemented | Implement account deletion flow |
| SEC-05 | Medium | Security | N/A | No session revocation list | Show active sessions, revoke individually | Not implemented | Add session management UI |
| SEC-06 | High | Security | N/A | No rate limiting on any auth endpoint | Rate limit: register, login, reset, resend | Missing entirely | Add rate limiting middleware |
| SEC-07 | Medium | Security | N/A | No CSRF protection on server actions | All actions vulnerable to CSRF | Next.js actions lack CSRF by default | Implement CSRF tokens or use SameSite cookies strictly |
| SEC-08 | Medium | Security | `lib/paths.ts:4-11` | `safeInternalPath` prevents open redirects ✓ | Good | Validation implemented | Keep |
| SEC-09 | Low | Security | N/A | No brute force protection | Lockout after N failed attempts | Not implemented | Add via Supabase config or custom tracking |
| SEC-10 | Low | Security | N/A | No security headers specific to auth | CSP, HSTS, etc. | General Next.js headers | Add auth-specific headers |

### Supabase Configuration (Inferred from Code)

| ID | Severity | Category | Area | Current State | Recommendation |
|----|----------|----------|------|---------------|----------------|
| CFG-01 | Medium | Config | Email Confirmation | Enabled (registration waits for email) ✓ | Keep enabled |
| CFG-02 | Medium | Config | Password Policy | Min 8 chars (client-side) | Enforce server-side via Supabase dashboard |
| CFG-03 | Medium | Config | Redirect URLs | Uses `siteOrigin()/auth/callback` | Verify all redirect URLs in Supabase dashboard |
| CFG-04 | Low | Config | SMTP | Assumed configured | Verify SMTP settings in Supabase |
| CFG-05 | Medium | Config | Session Config | Default Supabase settings | Review: session timeout, refresh token rotation |
| CFG-06 | Low | Config | Auth Hooks | None visible | Consider hooks for audit logging |
| CFG-07 | Medium | Config | Cookie Settings | Uses `@supabase/ssr` defaults | Verify `secure`, `sameSite`, `httpOnly` in production |

### Code Architecture

| ID | Severity | Category | File | Issue | Recommendation |
|----|----------|----------|------|-------|----------------|
| ARC-01 | Low | Architecture | `lib/auth/session.ts` | `getCurrentProfile` called multiple times per request | Add request-scoped memoization |
| ARC-02 | Low | Architecture | `app/auth/callback/route.ts:26-35` | `waitForProfile` polling (4 attempts × 150ms) | Consider webhook or DB trigger for profile creation |
| ARC-03 | Medium | Architecture | `features/auth/actions.ts` | All actions revalidate `/` layout | Scope revalidation to affected paths only |
| ARC-04 | Low | Architecture | `middleware.ts` | Runs on all routes (broad matcher) | Narrow matcher or skip static assets more aggressively |

---

## D. Security Assessment

### Attack Scenarios

| Scenario | Likelihood | Impact | Current Mitigation | Gap |
|----------|------------|--------|-------------------|-----|
| **Password Recovery Hijacking** | High | Critical | None | Recovery link grants full session (REC-01) |
| **User Enumeration via Registration** | Medium | Medium | Partial (resend is anti-enum) | Registration returns `email_taken` (REG-01) |
| **User Enumeration via Login** | Medium | Medium | Partial | `email_not_confirmed` distinguishes (LOG-01) |
| **Brute Force Login** | High | High | None | No rate limiting (LOG-05, SEC-06) |
| **Brute Force Password Reset** | Medium | High | None | No rate limiting on reset request (SEC-06) |
| **CSRF on Auth Actions** | Medium | High | None | No CSRF tokens (SEC-07) |
| **Session Fixation** | Low | Medium | Supabase handles | Verify session regeneration on login |
| **Open Redirect** | Low | Medium | `safeInternalPath` ✓ | Good |
| **Account Takeover via Email Change** | N/A | Critical | Not implemented | No email change flow (SEC-02) |
| **Persistent Sessions After Logout** | Medium | Medium | Single-session logout only | No global sign-out (SEC-03) |

### Security Weaknesses Summary

1. **No Rate Limiting** — The most critical missing defense. All auth endpoints are vulnerable to automated attacks.
2. **Recovery Session Confusion** — The architecture cannot distinguish a recovery session from a normal session, enabling bypass of password reset flow.
3. **No CSRF Protection** — Server actions accept form submissions without origin validation.
4. **Information Leakage** — Registration and login distinguish between "user exists" and "wrong password" scenarios.

---

## E. Missing Features

| Feature | Priority | Notes |
|---------|----------|-------|
| Rate limiting on auth endpoints | Critical | Middleware or edge function |
| CSRF protection for server actions | Critical | Double-submit cookie or header check |
| Re-authentication for sensitive ops | High | Current password required for password/email change |
| Email change flow | High | Verify new email, invalidate old sessions |
| Account deletion | High | With re-auth confirmation |
| Logout from all devices | Medium | `signOut({ scope: 'global' })` |
| Session management UI | Medium | List/revoke active sessions |
| Password strength meter | Medium | zxcvbn integration |
| Brute force lockout | Medium | Track failed attempts per IP/email |
| Security audit logging | Low | Login, password changes, sensitive ops |
| Two-factor authentication (2FA) | Low | TOTP or WebAuthn |
| Passkeys / WebAuthn | Low | Future enhancement |
| Device trust / remembered devices | Low | Reduce 2FA prompts |

---

## F. Test Coverage

### Existing Tests
**None found** in the codebase for authentication flows. The only tests are in `node_modules/`.

### Required Test Cases

| Area | Test Cases |
|------|------------|
| **Registration** | New email ✓, Existing email (anti-enum), Invalid email, Weak password, Password mismatch, Email verification flow, Resend verification |
| **Login** | Correct credentials, Incorrect password, Unknown email, Unverified email, Expired session, Logout, Rate limiting |
| **Password Recovery** | Valid recovery link, Expired recovery link, Reused recovery link, Recovery callback handling, Recovery session vs normal session, Password update, Password confirmation mismatch, Access reset page without recovery auth |
| **Security** | Unauthorized route access, Invalid callback params, Open redirect attempts, Session expiration, Concurrent sessions, Rate limiting, CSRF attempts |

---

## G. Recommended Implementation Roadmap

### AUTH-01: Registration Fixes (Week 1)
- [ ] REG-01: Anti-enumeration registration response
- [ ] REG-02: Consistent `/welcome` redirect for new users
- [ ] REG-05: OAuth email conflict detection in registration action
- [ ] Add server-side password strength validation
- [ ] Rate limiting on registration endpoint

### AUTH-02: Login & Session Management (Week 1-2)
- [ ] LOG-01: Anti-enumeration login error (generic failure)
- [ ] LOG-05: Rate limiting on login
- [ ] Add "remember me" extended session option
- [ ] Session regeneration on login (prevent fixation)

### AUTH-03: Password Recovery (Week 2) — **Highest Priority**
- [ ] **REC-01**: Fix recovery session hijacking — implement recovery token validation
- [ ] **REC-02/03**: Verify recovery context on reset page and update action
- [ ] **REC-04**: Dedicated recovery callback or type parameter
- [ ] **REC-05**: Track used recovery tokens (prevent reuse)
- [ ] **REC-06**: Gate reset page with recovery token
- [ ] Rate limiting on password reset requests

### AUTH-04: Email Verification (Week 2-3)
- [ ] VER-03: Expired verification link handling
- [ ] VER-04: Redirect unverified users to verification page
- [ ] Rate limiting on resend verification

### AUTH-05: Account Security (Week 3-4)
- [ ] SEC-01: Re-authentication for password change
- [ ] SEC-02: Email change flow with verification
- [ ] SEC-03: Logout from all devices
- [ ] SEC-04: Account deletion flow
- [ ] SEC-05: Session management UI
- [ ] SEC-06: **Rate limiting on ALL auth endpoints** (cross-cutting)
- [ ] SEC-07: **CSRF protection for server actions** (cross-cutting)
- [ ] SEC-09: Brute force lockout tracking

### AUTH-06: Authentication UI/UX (Week 4)
- [ ] Password strength meter
- [ ] Improved error messages (user-friendly)
- [ ] Loading states and accessibility
- [ ] Recovery flow UX improvements

### AUTH-07: End-to-End & Security Testing (Week 4-5)
- [ ] Write integration tests for all auth flows
- [ ] Security penetration testing
- [ ] Load testing auth endpoints
- [ ] Automated regression tests

---

## H. Final Recommendations

### Safest Implementation Order

1. **Start with AUTH-03 (Password Recovery)** — Critical vulnerability; fixes don't affect other flows
2. **Add Rate Limiting (AUTH-01/02/03/04/05 cross-cutting)** — Infrastructure change, protects everything
3. **Add CSRF Protection (AUTH-05 cross-cutting)** — Infrastructure change, protects all actions
4. **Fix Registration Anti-Enumeration (AUTH-01)** — Low risk, improves security
5. **Fix Login Anti-Enumeration (AUTH-02)** — Low risk, improves security
6. **Implement Account Security Features (AUTH-05)** — New features, require UI work
7. **Email Verification Improvements (AUTH-04)** — Low risk
8. **Testing (AUTH-07)** — Throughout

### Potential Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Recovery flow rewrite | Users with pending recovery links | Invalidate old links; communicate change |
| Anti-enumeration errors | Error messages change | Update copy; test UX |
| CSRF tokens | All forms need token | Automatic via middleware; test thoroughly |
| Rate limiting | Legitimate users may hit limits | Generous limits; exponential backoff |
| Session changes | Existing sessions | Gradual rollout; session migration |

### Architectural Improvements to Consider

1. **Centralized Auth Guard** — Extract route protection logic to reusable middleware/function
2. **Auth Event System** — Emit events (login, logout, password change) for audit logging
3. **Session Store Abstraction** — Decouple from Supabase for testability
4. **Recovery Token Service** — Dedicated service for password recovery token lifecycle

---

## Appendix: File Reference Map

```
Authentication Entry Points:
├── app/[lang]/(auth)/login/page.tsx
├── app/[lang]/(auth)/register/page.tsx
├── app/[lang]/(auth)/forgot-password/page.tsx
├── app/[lang]/(auth)/reset-password/page.tsx
└── app/auth/callback/route.ts

Server Actions:
└── features/auth/actions.ts

Session & Profile:
├── lib/auth/session.ts
└── lib/auth/errors.ts

Supabase Clients:
├── lib/supabase/server.ts
├── lib/supabase/client.ts
├── lib/supabase/public.ts
├── lib/supabase/middleware.ts
└── lib/supabase/env.ts

Middleware:
└── middleware.ts

Client Components:
├── components/auth/LoginForm.tsx
├── components/auth/RegisterForm.tsx
├── components/auth/ForgotPasswordForm.tsx
├── components/auth/ResetPasswordForm.tsx
├── components/auth/GoogleAuthButton.tsx
├── components/auth/LogoutButton.tsx
├── components/auth/AuthShell.tsx
└── components/auth/PasswordField.tsx

Onboarding:
├── app/[lang]/(member)/welcome/page.tsx
├── components/profiles/WelcomeForm.tsx
└── features/profiles/actions.ts

Validation:
└── lib/validations/profile.ts

Routing:
└── lib/paths.ts

Database:
└── supabase/migrations/20261116020000_profiles.sql (and subsequent)
```

---

*Report generated: 2026-11-22*
*Audit scope: Phase 1 — Read-only analysis of existing authentication system*
*No source code was modified during this audit.*