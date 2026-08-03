# Security Watchdog Report — 2026-08-03

**Auditor:** Automated weekly watchdog  
**Scope:** fixr-pro-rede root + admin/, supabase/functions/, supabase/migrations/  
**Budget used:** ~18 tool calls

---

## Summary

This week had **no new supabase functions or migrations** added (git log since 7 days clean). The backlog from `security_ship_freeze` is mostly still open — 3 of 5 tracked issues remain unresolved. Dependency CVEs are the most actionable near-term work: 5 HIGH vulns in root with `npm audit fix` available, and 4 HIGH in admin/ including a libvips chain through `sharp`. No secrets were detected in tracked files or recent commits.

---

## Critical (Block ship)

_Nothing newly introduced this week. The open backlog items below are carry-over._

---

## High

### H1 — `handle_dispatch_response` missing caller identity check [STILL-OPEN]

**File:** `supabase/migrations/010_apply_missing.sql:521`  
**Issue:** The function is `SECURITY DEFINER` and `GRANT EXECUTE TO authenticated`. It accepts `(p_dispatch_id, p_response)` but never asserts `auth.uid() = v_dispatch.professional_id`. Any authenticated user (including clients) can accept or decline dispatch events on behalf of any professional.  
**Risk:** Dispatch manipulation — a bad actor could accept someone else's job, deny a competitor's dispatch, or corrupt the matching engine.  
**Fix:** Add at the start of the `BEGIN` block, after fetching `v_dispatch`:
```sql
IF auth.uid() IS DISTINCT FROM v_dispatch.professional_id THEN
  RAISE EXCEPTION 'Not authorized to respond to this dispatch';
END IF;
```

---

### H2 — `search_professionals` returns `phone` to `anon` [STILL-OPEN]

**File:** `supabase/migrations/027_fixr_search_ranking.sql:92,197`  
**Issue:** `GRANT EXECUTE TO anon, authenticated, service_role` and the result set at line 92 includes `p.phone`. Unauthenticated callers can enumerate all professional phone numbers via the public search API.  
**Risk:** Phone number harvesting / spam. Also flagged in migration 043 comment as "pending — quebra front se isolado".  
**Fix (minimal):** Remove `p.phone` from both `SELECT` statements in `search_professionals` and `top_professionals`. Expose phone only in the authenticated, post-match RPC.

---

### H3 — `generate_weekly_report` callable by any `authenticated` user [STILL-OPEN]

**File:** `supabase/migrations/041_weekly_admin_report.sql:228`  
**Issue:** `GRANT EXECUTE ON FUNCTION public.generate_weekly_report(DATE) TO authenticated;` with NO internal `has_role('admin'...)` guard. The function is `SECURITY DEFINER` (bypasses RLS). Any logged-in user can generate and write a weekly_reports row, observe aggregate revenue/booking figures, and waste DB resources.  
**Fix:** Either (a) add a guard at the top of the function body:
```sql
IF NOT has_role('admin'::app_role, auth.uid()) THEN
  RAISE EXCEPTION 'admin only';
END IF;
```
or (b) change the grant to a dedicated admin role if one exists.

---

### H4 — Dependency CVEs: 5 HIGH in root, 4 HIGH in admin [NEW]

**Root (`npm audit --omit=dev`):**

| Package | Range | CVE / Advisory | Fix |
|---------|-------|----------------|-----|
| `postcss` | <=8.5.17 | XSS via `</style>`, path traversal via sourceMappingURL | `npm audit fix` |
| `ws` | 8.0.0–8.20.1 | Memory disclosure + DoS from tiny fragments | `npm audit fix` |
| `vite` | <=6.4.2 | (HIGH — details in advisory) | `npm audit fix` — **requires major bump to v8** |
| `brace-expansion` | <=1.1.16 | ReDoS | `npm audit fix` |
| `fast-uri` | <=3.1.3 | (HIGH) | `npm audit fix` |

**Admin (`/home/user/fixr-pro-rede/admin`):**

| Package | Range | CVE / Advisory | Fix |
|---------|-------|----------------|-----|
| `next` | 9.3.4-canary – 16.3.0-preview.7 | (HIGH — multiple advisories) | `npm audit fix` |
| `postcss` | <=8.5.17 | Same as root | `npm audit fix` |
| `sharp` | <0.35.0 | libvips: CVE-2026-33327/33328/35590/35591 | `npm audit fix` |
| `ws` | 8.0.0–8.20.1 | Same as root | `npm audit fix` |

**Recommended action:** Run `npm audit fix` in root and in admin/. The `vite` fix is a major bump — test after upgrading.

---

## Medium

### M1 — `create-payment-intent` trusts `amount_cents` from request body [STILL-OPEN / PARTIAL]

**File:** `supabase/functions/create-payment-intent/index.ts:70`  
**Status:** PARTIALLY FIXED — JWT validation and `client_id` ownership check were added. However, `amount_cents` is still accepted verbatim from the request body (line 70) without server-side verification against the agreed service price stored in `service_requests` or `broadcast_requests`.  
**Risk:** A client could undercharge (pay less than agreed) or manipulate the Stripe amount. Low likelihood if professionals verify payout, but worth closing.  
**Fix:** After fetching the broadcast record (line 130–137), look up the expected `quoted_price_cents` from the DB and ignore the body's `amount_cents`.

---

## Low

### L1 — Outdated major versions (admin package)

Packages more than 2 major versions behind (current → latest):

| Package | Current (lockfile) | Latest |
|---------|--------------------|--------|
| `react` / `react-dom` | 17.x | 19.2.8 |
| `next` | ~13.x | 16.2.12 |

These are upgrade-planning items, not immediate security issues.

---

## No-op (Checked, came back clean)

- **Secrets scan** — grepped all `*.ts, *.tsx, *.js, *.jsx, *.sql, *.env, *.json, *.md` for Stripe live keys, Supabase secrets, private keys, JWT tokens. **Zero hits.** No tracked `.env` files in git.
- **push-notify JWT validation** — **FIXED** since last report. Function now requires `Authorization: Bearer <token>` and validates via `db.auth.getUser()` before processing.
- **New edge functions / RPCs this week** — `git log --since='7 days ago' -- supabase/functions/** supabase/migrations/**` returned **no results**. Nothing new to flag.
- **Injected credentials in recent commits** — `git log --since='7 days ago'` returned **no commits** in the last 7 days. Repo is quiet this week.

---

## Recommended priorities this sprint

1. `npm audit fix` in root + admin/ — low risk, immediate CVE closure.
2. Add `auth.uid()` guard to `handle_dispatch_response` — one-line fix, high impact.
3. Remove `phone` from `search_professionals` anon grant — coordinate with front-end.
4. Add admin guard inside `generate_weekly_report`.
