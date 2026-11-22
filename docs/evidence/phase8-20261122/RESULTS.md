# Phase 8 run — results template

**Status:** NOT EXECUTED. Fill this file from the real browser run described in
`docs/master-plan/PHASE-8-RUNTIME-VALIDATION.md`. Do not mark any scenario Pass
without a measured value and an evidence file.

Date / browser / build (current or baseline):

Network profile:

Account(s) used:

| # | Scenario | Pass/Fail | Measured value | Evidence file | Note |
|---|----------|-----------|----------------|---------------|------|
| 1 | Shell identity + studio exit | | | | |
| 2 | Explore tile restore (large) | | ΔY=, settle=ms | | |
| 3 | Explore tile restore (default) | | ΔY=, settle=ms | | |
| 4 | Explore author/interlude links | | ΔY=, settle=ms | | |
| 5 | Explore pagination scroll-to-top | | | | |
| 6 | Loading skeletons / profile boundary | | | | |
| 7 | Account-switch isolation | | | | |
| 8 | `auth.getUser` calls per navigation | | count= | | |
| 9 | Back/Forward + direct URL | | | | |
| 10 | Auth regression smoke | | | | |
| 11 | Repeated nav memory/listeners | | heap= MB | | |
| 12 | Pull-to-Refresh / offline | | | | |
| 13 | Language switch + Explore search | | lang= | | |

## Notes / failures

None recorded yet. Log every failure here with a tracked follow-up; Phase 8
cannot be marked done while any Pass rule is unmet.

## Supabase-side items still required outside this repo

- Reset Password template assignment
- delete-account Edge Function secret and deployment
- Secure email change and reauthentication emails
- Redirect allow-list for `{SITE_URL}/auth/callback?**` and `/auth/recovery?**`
- Host/proxy rate limits
