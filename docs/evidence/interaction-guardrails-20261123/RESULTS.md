# Interaction guardrails: like/follow spam, races, and follow-status sync

Date: 2026-11-23

## Goal

Harden appreciation and follow against spam, races, and stale UI, while keeping optimistic taps responsive. After a follow click, `/creation/[id]` must show the same status as Explore/Search.

## What changed

- Client sends an explicit desired state (`true`/`false`), not a blind toggle.
- `FollowButton`, `AppreciateForm`, and feed likes queue the last intent and roll back on failure.
- Server actions call `set_reaction_state` / `set_follow_state` RPCs with advisory locks, durable event logs, and hourly caps (`REACTION_PER_HOUR = 60`, `FOLLOW_PER_HOUR = 40`). Unfollow/unlike cannot reset the allowance.
- Duplicate rows (`23505`) are treated as success. Follow revalidates explore, home, profile, and that creator's published creation pages.
- Form parsing keeps `"true"`/`"false"` strings. Coercing them to booleans before Zod was rejecting every follow/like with `invalid_input` (`Periksa isian.`).

The migration is in `supabase/migrations/20261123000000_interaction_guardrails.sql` and still needs to be applied on the remote project. Until then, the actions fall back to idempotent inserts/deletes.

## Static checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 99 files / 741 tests passed (plus later targeted tests for the form-parse fix) |
| `npm run build` | Passed |
| `git -c core.safecrlf=false diff --check` | Clean |
| Scoped ESLint | Clean |

## Browser follow-status sync

Production build on `http://127.0.0.1:3100`, Chrome CDP, authenticated `rsdy`, creation `/creation/b8cbd1b1-f295-4bf4-aa0f-6386fa9a4cc9` (`@chyprsty__`).

| Assertion | Result |
| --- | --- |
| Tap Follow: `Ikuti` → `Mengikuti` | Pass |
| Reload of `/creation/[id]` still `Mengikuti` | Pass |
| Search Creators card matches detail | Pass |
| Rapid triple tap converges on last intent | Pass |
| Original unfollowed state restored | Pass |

See `follow-sync.json`.
