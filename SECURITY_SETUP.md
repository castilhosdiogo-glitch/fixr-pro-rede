# Security Setup - Post-Implementation Checklist

## ✅ Completed Today

1. **ESLint Stricter Rules** — Now enforces:
   - `no-unused-vars` with auto-fix capability
   - `no-explicit-any` warnings (helps identify type issues)
   - React Hooks best practices

2. **Sentry Error Tracking** — Integrated into `src/main.tsx`:
   - Tracks unhandled exceptions in production
   - Captures component errors via ErrorBoundary
   - Session replay on errors (100% sample rate)
   - Configuration: `VITE_SENTRY_DSN` env variable

3. **Dependabot Automation** — Created `.github/dependabot.yml`:
   - Daily security updates for npm
   - Weekly checks for GitHub Actions
   - Auto-PR creation for vulnerabilities
   - Timezone: America/Sao_Paulo

4. **Security Policy Document** — Created `SECURITY.md`:
   - Covers SAST, SCA, DAST, monitoring
   - Pre-launch checklist
   - Incident response procedures
   - LGPD compliance tracking

5. **Vulnerability Reduction**:
   - Before: 21 vulnerabilities (12 high)
   - After: 9 vulnerabilities (3 high)
   - Major fix: react-router XSS vulnerability patched

## 🚀 Next Steps (This Week Before Hosting)

### 1. Sentry Project Setup (30 min)

```bash
# Visit https://sentry.io/
# 1. Create new project (React/Next.js)
# 2. Copy DSN from project settings
# 3. Add to .env file:
echo "VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxxxx" >> .env

# Verify Sentry works in production build:
npm run build
# Check dist/ contains Sentry sourcemaps
```

### 2. Fix Remaining ESLint Warnings (1-2 hours)

The 8 files with ESLint warnings should be cleaned:
```bash
npm run lint:fix
```

Then manually review:
- **InstallPrompt.tsx** (lines 6, 10) — Type annotation for BeforeInstallPromptEvent
- **ProfessionalsSection.tsx** (line 29) — Type unknown array
- **ReviewForm.tsx** (line 42) — Type event handler
- **StripePaymentForm.tsx** — Type Stripe components

Example fix:
```typescript
// Before
const handleEvent = (e: any) => { ... }

// After
const handleEvent = (e: BeforeInstallPromptEvent) => { ... }
```

### 3. Semgrep Installation (Optional - For Local SAST)

**Option A: Docker (Recommended)**
```bash
docker run -v $(pwd):/src returntocorp/semgrep semgrep \
  --config=p/security-audit /src/src
```

**Option B: CLI (If Docker not available)**
```bash
# Install Semgrep (macOS/Linux/Windows)
# https://semgrep.dev/docs/getting-started/

semgrep --config=p/security-audit src/
```

Or simply run via npm script (requires Semgrep CLI installed):
```bash
npm run scan:sast
```

### 4. Vulnerability Monitoring (15 min)

1. **GitHub Security Tab**:
   - Go to repo Settings → Security
   - Enable "Dependabot alerts"
   - Enable "Dependabot security updates"
   - Enable "Private vulnerability reporting"

2. **Weekly Audit Review**:
   ```bash
   npm audit
   npm audit fix  # Only for moderate/low if no breaking changes
   ```

3. **Monitor Sentry Alerts**:
   - Set email notifications: Settings → Integrations
   - Create alert rules: Settings → Alerts

## 📊 Security Metrics (Week 1)

Track before hosting:

| Metric | Target | Status |
|--------|--------|--------|
| npm vulnerabilities | 0 critical | ✅ 0/21 high |
| ESLint warnings | <10 | ⚠️ 11 (mostly `any`) |
| Test coverage | >80% | 📋 Run vitest |
| Sentry DSN configured | Yes | ⏳ Pending |
| Dependabot active | Yes | ✅ Configured |
| LGPD compliance | 100% | ✅ delete_user_data() ready |
| Payment idempotency | Verified | ✅ Implemented |

## 🔒 Pre-Launch Security Tests (Week 2)

1. **LGPD User Deletion Test**
   ```typescript
   // In admin console or direct DB call:
   await supabase.rpc('delete_user_data', {
     user_id: 'test-user-uuid'
   });
   
   // Verify:
   // - user record anonymized
   // - personal data cleared
   // - audit_log records deletion
   ```

2. **Payment Idempotency Test**
   ```typescript
   // Same idempotency key = same response
   const key = "test-user-123-2024-04-02";
   const intent1 = await createPaymentIntent({
     idempotency_key: key,
     amount_cents: 5000,
     broadcast_id: 'test-broadcast'
   });
   
   const intent2 = await createPaymentIntent({
     idempotency_key: key,
     amount_cents: 5000,
     broadcast_id: 'test-broadcast'
   });
   
   expect(intent1.id).toBe(intent2.id);
   ```

3. **Amount Validation Test**
   ```typescript
   // Should reject
   await expect(createPaymentIntent({ amount_cents: 50 }))
     .rejects.toThrow('Valor deve ser entre R$1,00 e R$100.000,00');
   
   // Should accept
   await createPaymentIntent({ amount_cents: 100 }); // R$1.00
   await createPaymentIntent({ amount_cents: 10000000 }); // R$100k
   ```

## 🚨 Critical Issues to Monitor

### Current High-Severity Vulnerabilities

1. **@remix-run/router** (XSS via Open Redirects)
   - Status: FIXED via npm audit fix
   - Impact: Prevents malicious redirects in routing

2. **serialize-javascript** (RCE + DoS)
   - Status: Transitive dependency (workbox-build)
   - Impact: Dev-only, not in production code
   - Action: Monitor for patches

3. **esbuild** (Server CORS issue)
   - Status: Dev-only vulnerability
   - Impact: Development environment only
   - Action: Monitor for patches

## 📝 Checklist for Production Deployment

- [ ] Sentry DSN configured and tested
- [ ] ESLint warnings < 10 (or all `any`s typed)
- [ ] npm audit shows 0 critical vulnerabilities
- [ ] Build completes without errors
- [ ] Tests pass (npm run test)
- [ ] LGPD deletion flow tested
- [ ] Payment idempotency verified
- [ ] .github/dependabot.yml reviewed
- [ ] SECURITY.md shared with team
- [ ] Hosting provider secrets configured
- [ ] VITE_SENTRY_DSN environment variable set in production
- [ ] Sentry alert rules created
- [ ] Monitoring dashboards set up
- [ ] Incident response team notified

## 🆘 If Issues Arise

### "Sentry DSN not loading"
```bash
# Verify environment variable:
echo $VITE_SENTRY_DSN

# Rebuild to include env:
npm run build

# Check browser console for Sentry errors
```

### "npm audit fails with errors"
```bash
# See full vulnerability details
npm audit --long

# Fix only specific vulnerabilities
npm audit fix --package-lock-only  # Don't update package.json
```

### "ESLint takes too long"
```bash
# Check for large files being linted
eslint . --debug 2>&1 | grep "time:"

# Add them to ignores in eslint.config.js if needed
```

## 📚 Reference Documentation

- [SECURITY.md](./SECURITY.md) — Full security policy
- [npm audit](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Semgrep Rules](https://semgrep.dev/explore)

---

**Last Updated**: 2026-04-02  
**Security Review Schedule**: Weekly during pre-launch, then biweekly post-launch
