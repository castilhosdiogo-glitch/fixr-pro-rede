# Security Watchdog Report — 2026-07-27

## Summary

Audit ran against `security-watchdog/2026-07-27`. No new edge functions or migrations
landed this week (git log empty for the last 7 days). The four pre-existing
`security_ship_freeze` backlog issues remain unresolved in the codebase — none were
fixed this week. The `push-notify` JWT validation fix from migration 038 is confirmed
working. Dependency CVEs are piling up: the `admin/` Next.js app now carries 22+
advisories against `next`; the root Vite app has 5 HIGH-severity findings. No
hardcoded secrets were detected. **Recommend unblocking the phone-in-anon-RPC and
the dispatch auth-bypass before the next release.**

---

## Critical (block ship)

### CRIT-1 — `search_professionals` returns `phone` to anonymous callers
- **Status:** STILL-OPEN
- **Location:** `supabase/migrations/027_fixr_search_ranking.sql:197`
- **Detail:** `GRANT EXECUTE ON FUNCTION public.search_professionals(...) TO anon, authenticated, service_role;`
  The RETURNS TABLE definition includes `phone TEXT` (line 61) and the SELECT includes
  `p.phone` (line 92). Any unauthenticated user can call this RPC and retrieve phone
  numbers for all matching professionals. This is a LGPD PII exposure.
- **Fix:** Either remove `phone` from the return type and SELECT, or restrict the GRANT
  to `authenticated` only, or mask the field (`LEFT(phone,4) || '****'`) for anon callers.

### CRIT-2 — `handle_dispatch_response` missing `auth.uid() = p_professional_id` guard
- **Status:** STILL-OPEN
- **Location:** `supabase/migrations/010_apply_missing.sql:521` (last definition),
  also `007_completion_and_fixes.sql:161`
- **Detail:** The function is `SECURITY DEFINER` and accepts `p_dispatch_id` + `p_response`
  without ever checking that `auth.uid()` matches the professional assigned to that
  dispatch. Any authenticated user can accept/decline any pending dispatch on behalf of
  any professional.
- **Fix:** Add at the top of the function body:
  ```sql
  IF v_dispatch.professional_id != auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  ```

---

## High

### HIGH-1 — `create-payment-intent` trusts `professional_id` and `amount_cents` from request body
- **Status:** STILL-OPEN
- **Location:** `supabase/functions/create-payment-intent/index.ts:69-70`
- **Detail:** Both `professional_id` and `amount_cents` are read from the JSON body.
  A malicious client can submit arbitrary amounts or target other professionals' accounts.
  The function should derive `professional_id` from `auth.uid()` server-side and validate
  `amount_cents` against a server-computed value (e.g., a pre-approved quote).

### HIGH-2 — `generate_weekly_report` GRANT to all `authenticated` (no internal admin check)
- **Status:** STILL-OPEN
- **Location:** `supabase/migrations/041_weekly_admin_report.sql:228`
- **Detail:** `GRANT EXECUTE ON FUNCTION public.generate_weekly_report(DATE) TO authenticated;`
  The function body (lines 45–220) performs no `is_admin` or `has_role('admin')` check.
  The RLS on the `weekly_reports` *table* is admin-only, but the function itself aggregates
  sensitive business metrics and could be called by any logged-in user.
- **Fix:** Add at the start of the function:
  ```sql
  IF NOT has_role('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  ```
  Or change the GRANT to a dedicated `admin` role.

### HIGH-3 — Dependency CVEs: `next` (admin app) — 22+ advisories
- **Location:** `admin/package.json`, `next@^16.2.3` (installed as some 16.x version)
- **Detail:** `npm audit` reports next as HIGH with 22 CVE advisories including
  GHSA-8h8q-6873-q5fj, GHSA-26hh-7cqf-hhc6, GHSA-ffhc-5mcf-pf4q and many more.
  Fix is available (`npm audit fix`).

### HIGH-4 — Dependency CVEs: `vite` (root app) — multiple advisories
- **Location:** `package.json` (root Vite app)
- **Detail:** `vite` flagged HIGH; fix requires a major-version bump (current in
  8.x range per audit). Also `ws`, `postcss`, and `brace-expansion` flagged HIGH
  in the root with fixes available.

### HIGH-5 — Dependency CVEs: `sharp` and `ws` (admin app)
- **Location:** `admin/package.json`
- **Detail:** `sharp` (GHSA-f88m-g3jw-g9cj) and `ws` (2 advisories) flagged HIGH.
  Fixes available.

---

## Medium

### MED-1 — Major-version drift: `next` is 16 generations behind latest
- **Location:** `admin/package.json`
- **Detail:** `npm outdated` shows `next` latest is v16 but latest stable from npm
  is 16.2.x vs stable — this aligns with what's pinned. The reported 16-version gap
  may reflect pre-release numbering. Verify with `npm show next dist-tags.latest`.

---

## Low

*(none this week)*

---

## Fixed (confirmed)

### FIXED-1 — `push-notify` JWT validation
- **Migration:** `038_push_notify_hardening` (referenced in migration list)
- **Code:** `supabase/functions/push-notify/index.ts:117-130` — function now checks
  `Authorization: Bearer <token>` header and validates via `supabase.auth.getUser(token)`.
  Returns 401 if missing or invalid. **This backlog item is CLOSED.**

---

## No-op (checked, clean)

- **Hardcoded secrets scan:** No live keys found. `STRIPE_SETUP.md` contains only
  placeholder values (`sk_test_xxxxx`). Scan covered `*.ts`, `*.tsx`, `*.js`, `*.jsx`,
  `*.sql`, `*.json`, `*.md` excluding `node_modules`.
- **New edge functions / RPCs this week:** None. `git log --since='7 days ago'`
  returned empty for `supabase/functions/**` and `supabase/migrations/**`.
- **New commits this week:** Zero commits in the last 7 days.
- **Dev-only CVEs:** Skipped per scope (`--omit=dev`).

---

*Generated by security-watchdog autonomous audit · 2026-07-27*
