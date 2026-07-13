# Security Watchdog Report — 2026-07-13

**Run date:** 2026-07-13  
**Branch scanned:** main (HEAD 80743b5)  
**Scope:** CVEs, secrets, outdated majors, backlog re-verification, new edge functions/migrations

---

## Summary

This week's audit found **two new HIGH CVEs** in the admin Next.js app that need patching (next@16.2.3 is vulnerable to DoS and middleware-bypass attacks fixed in 16.2.6). Four of five security-backlog items remain **STILL-OPEN**; one (`push-notify` JWT validation) is confirmed **FIXED**. No secrets were found in recent commits. No new edge functions or migrations were added in the last 7 days.

---

## Critical (block ship)

_None this week._

---

## High

### H-1 · admin/next@16.2.3 — multiple HIGH CVEs, fix available

**Installed:** `16.2.3` (`admin/package-lock.json`)  
**Required:** ≥ 16.2.6  
**CVEs (all HIGH, CVSS 7.5–8.6):**

| Advisory | Title | Fixed in |
|---|---|---|
| GHSA-8h8q-6873-q5fj | DoS via Server Components | 16.2.5 |
| GHSA-26hh-7cqf-hhc6 | Middleware/Proxy bypass via segment-prefetch (incomplete fix follow-up) | 16.2.6 |
| GHSA-c4j6-fc7j-m34r | SSRF via WebSocket upgrades (CVSS 8.6) | 16.2.5 |
| GHSA-492v-c6pp-mqqv | Middleware bypass via dynamic route param injection (CVSS 8.1) | 16.2.5 |
| GHSA-mg66-mrh9-m8jx | DoS via connection exhaustion in Cache Components | 16.2.5 |

**Fix:** `cd admin && npm install next@^16.2.6`

---

### H-2 · admin/ws — Memory exhaustion DoS (GHSA-96hv-2xvq-fx4p, CVSS 7.5)

`ws@8.0.0–8.20.1` is pulled as a transitive dep of `next`. Unauthenticated attacker can exhaust server memory with tiny fragmented WebSocket frames.  
**Fix:** fixed by upgrading `next` (see H-1).

---

## Medium

### M-1 · generate_weekly_report — GRANT to `authenticated` without internal admin guard (STILL-OPEN)

`supabase/migrations/041_weekly_admin_report.sql:228`
```sql
GRANT EXECUTE ON FUNCTION public.generate_weekly_report(DATE) TO authenticated;
```
The function body has no `IF NOT has_role('admin', auth.uid()) THEN RAISE EXCEPTION` guard. Any logged-in user can call this SECURITY DEFINER function and trigger full data aggregation over broadcast_requests, professional_profiles, waiting_list, etc. The `weekly_reports` table has admin-only RLS, so results aren't readable by non-admins, but the compute/aggregation itself is unrestricted.

**Fix:** Add admin check at the top of the function body, or change the GRANT to a specific admin role.

---

### M-2 · search_professionals — returns `phone` to `anon` (STILL-OPEN)

`supabase/migrations/027_fixr_search_ranking.sql:61,92,197`
```sql
-- Line 61: phone TEXT in return type
-- Line 92: p.phone selected
-- Line 197: GRANT EXECUTE TO anon, authenticated, service_role;
```
Unauthenticated callers can enumerate professionals' phone numbers via this RPC.

**Fix:** Remove `phone` from the SELECT and return type for the anon-accessible version, or strip it via a security barrier view and remove `anon` from the GRANT.

---

### M-3 · create-payment-intent — amount_cents trusted from request body (STILL-OPEN)

`supabase/functions/create-payment-intent/index.ts` accepts `amount_cents` from the request body (validated by schema for type/range, but never cross-checked against the actual agreed price stored in the DB). An authenticated client could craft a payment intent for an arbitrary amount (e.g., 1 cent instead of the real price).

JWT validation and caller ↔ client_id binding are now present (good). The gap is the absence of a DB lookup that asserts `amount_cents == service_requests.agreed_price_cents`.

**Fix:** After fetching the `broadcast` record, add a check: `if (amount_cents !== broadcast.agreed_price_cents) return errorResponse("FORBIDDEN", "Amount mismatch", 403)`.

---

## Low

### L-1 · handle_dispatch_response — no `auth.uid() = professional_id` guard (STILL-OPEN)

`supabase/migrations/010_apply_missing.sql:521`  
The function takes `p_dispatch_id` and `p_response`, looks up the dispatch record, but never verifies that `auth.uid() = v_dispatch.professional_id`. Any authenticated user who knows or guesses a dispatch UUID can accept or decline on behalf of any professional.

_Lower severity than originally categorized because dispatch UUIDs are not guessable (v4), but the access control gap is real._

**Fix:** Add at the start of the function body:
```sql
IF auth.uid() != v_dispatch.professional_id THEN
  RAISE EXCEPTION 'Forbidden';
END IF;
```

---

## No-op (checked, came back clean)

- **Secrets in repo/recent commits:** `grep` over all `.ts/.tsx/.js/.jsx/.json/.sql/.md` files found no live keys (`sk_live_`, `sb_secret_*`, raw JWTs, private keys). Last 30 commits also clean.
- **push-notify JWT validation:** **FIXED** — `index.ts:117–132` now validates Bearer token via `db.auth.getUser()` before processing.
- **New edge functions/migrations this week:** `git log --since='7 days ago'` returned no changes under `supabase/functions/` or `supabase/migrations/` — nothing new to flag.
- **Root npm audit:** DOMPurify has 9 moderate CVEs (no HIGH/CRITICAL); skipped per scope rules.
- **Outdated majors (>2 major versions behind):** None identified in root or admin beyond the next CVE already flagged above.

---

## Recommended triage order

1. `cd admin && npm install next@^16.2.6` — H-1/H-2, 5-minute fix, no code changes needed.
2. Add admin guard to `generate_weekly_report` — M-1, one SQL migration.
3. Strip `phone` from `search_professionals` anon grant — M-2, one migration.
4. Verify `amount_cents` against DB in `create-payment-intent` — M-3, ~10 lines of TS.
5. Add `auth.uid()` check to `handle_dispatch_response` — L-1, one migration.
