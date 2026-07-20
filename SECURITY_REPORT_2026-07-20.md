# Security Watchdog — 2026-07-20

**Auditor:** automated watchdog  
**Scope:** root + admin/ · last 30 commits · supabase/functions + migrations  
**Compared to baseline:** `aba6d19` (fix(rls): hardening pós-auditoria)

---

## Summary

Two long-standing backlog items remain open (`handle_dispatch_response` auth bypass and `search_professionals` leaking `phone` to anon), and `generate_weekly_report` is grantable to any authenticated user without an internal admin guard. On the positive side, `push-notify` JWT validation and `create-payment-intent` caller enforcement are confirmed fixed. Five HIGH-severity CVEs with available fixes are outstanding across root and admin. No secrets were detected in the week's diff. Migration 043 (RLS hardening, landed this week) was reviewed and looks correct.

---

## Critical (block ship)

_None this week._

---

## High

### H1 — `handle_dispatch_response`: missing caller identity check  **STILL-OPEN**

**File:** `supabase/migrations/010_apply_missing.sql:521` (latest definition)  
**Risk:** Any authenticated user can accept or decline any dispatch (`p_dispatch_id`) on behalf of any professional. The function is `SECURITY DEFINER` + `GRANT … TO authenticated` and the only guard is `WHERE id = p_dispatch_id AND status = 'pending'` — there is no `AND professional_id = auth.uid()` check.  
**Fix:** Add at the top of the function body:
```sql
IF v_dispatch.professional_id <> auth.uid() THEN
  RAISE EXCEPTION 'Forbidden: caller is not the dispatched professional';
END IF;
```

### H2 — `search_professionals`: `phone` returned to `anon`  **STILL-OPEN**

**File:** `supabase/migrations/027_fixr_search_ranking.sql:61,92,176,214,233`  
**Risk:** Phone numbers of all professionals in the result set are returned to unauthenticated callers. `GRANT EXECUTE … TO anon` is explicit at line 197.  
**Fix:** Remove `phone` from the SELECT columns in the anon-callable version, or create a separate public view without PII. (Noted in 043 as pending — still unresolved.)

### H3 — `generate_weekly_report`: broad `authenticated` grant, no internal admin check  **STILL-OPEN**

**File:** `supabase/migrations/041_weekly_admin_report.sql:228`  
**Risk:** `GRANT EXECUTE … TO authenticated` means any logged-in user (client or professional) can trigger full aggregated report generation. Function is `SECURITY DEFINER` so it bypasses RLS while running. The RLS on `weekly_reports` prevents the caller from *reading* the row, but the function still aggregates all data, writes the report row, and may expose timing side-channels.  
**Fix:** Add guard at function entry:
```sql
IF NOT has_role('admin'::app_role, auth.uid()) THEN
  RAISE EXCEPTION 'Access denied: admin only';
END IF;
```
Then narrow the GRANT to a dedicated `admin` role or remove it and invoke only via service-role cron.

---

## Medium — Dependency CVEs (HIGH severity, fix available)

### Root (`npm audit --omit=dev`)

| Package | CVE / Advisory | CVSS | Fix |
|---------|---------------|------|-----|
| `fast-uri` | GHSA-q3j6-qgpj-74h6 — path traversal via %-encoded dot segments | 7.5 | upgrade |
| `fast-uri` | GHSA-v39h-62p7-jpjc — host confusion via %-encoded authority delimiters | 7.5 | upgrade |
| `vite` | GHSA-fx2h-pf6j-xcff — `server.fs.deny` bypass on alternate paths | 7.5 | upgrade |
| `ws` | GHSA-96hv-2xvq-fx4p — memory exhaustion DoS from tiny fragments | 7.5 | upgrade |

Run: `npm audit fix` in repo root (review patch scope before committing).

### admin/

| Package | Advisory | Fix |
|---------|----------|-----|
| `next` | DoS with Server Components + Middleware/proxy bypass via segment-prefetch routes | upgrade Next.js |
| `ws` | memory exhaustion DoS + uninitialized memory disclosure | upgrade |

Run: `npm audit fix` in `admin/`.

---

## Low

- **Outdated majors (>2 behind):** none detected in root or admin.
- **Secrets scan (last 7 days diff):** clean — no hardcoded tokens, private keys, or service-role credentials found in changed files.

---

## No-op (checked, came back clean)

| Check | Result |
|-------|--------|
| `push-notify` JWT validation | **FIXED** — `authorization` header checked + `auth.getUser()` verified (functions/push-notify/index.ts:117–131) |
| `create-payment-intent` body hijack | **FIXED** — JWT caller verified and must match `client_id` (index.ts:82–87) |
| Secrets in this week's changed files | Clean |
| New edge functions this week | None |
| Major version drift (>2 majors behind) | None |
| Migration 043 RLS patches (mei_limit_logs, notifications, referral_codes, referrals) | Correct — all four policies properly scoped |

---

## New migrations/code reviewed this week

| Path | Status |
|------|--------|
| `supabase/migrations/043_rls_hardening_audit.sql` | Reviewed — 4 RLS policies corrected, no new attack surface introduced |
| `src/pages/AuthPage.tsx`, `ResetPasswordPage.tsx` | Auth flow added — no secrets or insecure patterns observed |

---

## Action items for triage

1. **H1** — Patch `handle_dispatch_response` (one IF block, low risk).  
2. **H2** — Remove `phone` from `search_professionals` public columns (needs front-end refactor per 043 comment).  
3. **H3** — Add admin guard to `generate_weekly_report` before next cron run.  
4. **M** — `npm audit fix` in root and admin, review diff, commit.
