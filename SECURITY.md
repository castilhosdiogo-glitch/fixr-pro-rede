# PROFIX Security Policy

## Overview
PROFIX implements a comprehensive security strategy covering threat detection, dependency management, error tracking, and compliance monitoring. This document outlines our security practices for the Brazilian fintech marketplace.

## 1. Static Application Security Testing (SAST)

### Tools & Configuration

**ESLint + TypeScript**
- No explicit `any` types (promotes type safety)
- Catch unsafe type assignments
- Unused variable detection
- React Hooks best practices

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

**Semgrep Security Audit**
- OWASP Top 10 vulnerability patterns
- Injection attack detection
- Insecure cryptography checks
- Security best practices violations

```bash
# Run security static analysis
npm run scan:sast
```

### Critical Rules Enforced

1. **No Implicit Any** — All variables must have explicit types
2. **No Unsafe Type Operations** — Prevents type coercion vulnerabilities
3. **No Unused Variables** — Reduces dead code attack surface
4. **React Hooks Rules** — Prevents state management bugs

## 2. Software Composition Analysis (SCA)

### Dependency Management

**Dependabot (Automated)**
- Daily checks for security vulnerabilities
- Automatic PR creation for updates
- Prioritizes security patches
- Timezone: America/Sao_Paulo

```yaml
# Configuration in .github/dependabot.yml
- npm: daily security updates
- github-actions: weekly checks
```

**npm audit (Local)**
```bash
npm audit
npm audit fix
```

### Dependency Update Strategy

| Severity | Action | Timeline |
|----------|--------|----------|
| Critical | Merge immediately | Same day |
| High | Review & merge | Within 24h |
| Medium | Review & merge | Within 1 week |
| Low | Batch monthly | Monthly |

## 3. Dynamic Application Security Testing (DAST)

### Pre-Launch Testing

**OWASP ZAP Community Edition**
```bash
docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t https://staging.profix.com
```

**Nuclei Scanner**
```bash
nuclei -u https://staging.profix.com \
  -t cves/ \
  -t security-misconfiguration/
```

### Testing Areas
- Input validation (SQL injection, XSS, command injection)
- Authentication bypass
- Authorization flaws
- Sensitive data exposure
- API endpoint vulnerabilities

## 4. Error Tracking & Monitoring

### Sentry Integration

**Configuration**
- Environment: production
- Trace sample rate: 10% (limits overhead)
- Session replay: 1% baseline, 100% on errors
- Sensitive data masking: enabled

```typescript
// Environment variable required
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxxxx
```

**Monitored Events**
- Unhandled exceptions
- Component errors (via ErrorBoundary)
- API failures
- Payment processing errors
- LGPD compliance events

**Alerts Configured**
- 5+ errors in 5 minutes → Slack notification
- Payment failures → Immediate alert
- Authentication failures → 10+ in 10min

## 5. Compliance & Privacy

### LGPD (Lei Geral de Proteção de Dados)

**Implemented Controls**
- ✅ Consent checkbox on registration
- ✅ `user_consents` table with audit trail
- ✅ `delete_user_data()` RPC function for Article 17 (right to be forgotten)
- ✅ Audit log for all data access
- ✅ Data export endpoint for Article 20

**Testing Protocol**
1. Register new user → consent required
2. Delete account → verify all personal data removed
3. Export data → verify completeness
4. Audit log → verify all operations recorded

### Payment Security

**Idempotency**
- Unique `idempotency_key` per payment attempt
- Prevents double-charging on network failures
- Key format: `{user_id}-{broadcast_id}-{timestamp}`

**Amount Validation**
- Range: R$1.00 to R$100,000.00
- Validated at frontend AND database level
- CHECK constraint prevents edge cases

**Commission Calculation**
- 15% commission on all payments
- Calculated at database layer
- Verified in payout triggers

## 6. Infrastructure Security (Post-Launch)

### Monitoring Stack

**Grafana + Prometheus**
```yaml
Metrics:
  - API latency (Supabase)
  - Payment success rate
  - Push notification delivery
  - Error rate (5xx responses)
  - Database connection pool
  - Authentication failures
```

**Uptime Monitoring**
- Ping every 5 minutes
- Alert on 2+ consecutive failures
- Multiple geographic regions

## 7. Pre-Launch Checklist

### Week 1 (Before Hosting)
- [x] ESLint strict rules enabled
- [x] TypeScript strict checks
- [x] Semgrep installed
- [x] Sentry configured
- [x] Dependabot setup
- [ ] Run `npm run scan:sast` — 0 critical findings
- [ ] Run `npm audit` — 0 critical vulnerabilities
- [ ] LGPD deletion test — passes
- [ ] Payment idempotency test — passes

### Week 2 (Staging)
- [ ] DAST scan with ZAP
- [ ] Nuclei vulnerability scan
- [ ] Manual authentication testing
- [ ] SQL injection attempts (input validation)
- [ ] XSS payload testing
- [ ] Rate limiting verification

### Week 3+ (Production)
- [ ] Sentry monitoring active
- [ ] Alerting rules verified
- [ ] Daily security updates via Dependabot
- [ ] Weekly vulnerability scans
- [ ] Monthly security audit review

## 8. Incident Response

### Critical Vulnerability (CVSS 9+)

1. **Immediate** (< 1 hour)
   - Pull affected dependency version
   - Patch or downgrade available
   - Deploy to production

2. **Investigation** (1-24 hours)
   - Determine if app was exploited
   - Review logs in Sentry
   - Check audit trail

3. **Communication**
   - Notify affected users (if data breach)
   - Post-incident review
   - Public disclosure (if required)

### Zero-Day Protocol

If a vulnerability is discovered with no patch:
1. Disable affected feature immediately
2. Escalate to vendor
3. Implement WAF rules (if available)
4. Notify users within 24 hours

## 9. Security Contacts

- **Security Report**: security@profix.com.br
- **Incident Response**: +55 (XX) XXXX-XXXX
- **DevSecOps Lead**: @casti

## 10. Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-02 | 1.0 | Initial security policy |

---

**Last Updated**: 2026-04-02  
**Next Review**: Weekly (during pre-launch)  
**Classification**: Public
