.PHONY: security-audit gitleaks sast build-check

# Auditoria completa de seguranca
security-audit: gitleaks sast build-check
	@echo "Auditoria de seguranca concluida."

# Scan de secrets no historico do git
gitleaks:
	@echo "=== Gitleaks: scanning for secrets ==="
	gitleaks detect --source . --no-banner -v

# Analise estatica de seguranca (SAST)
sast:
	@echo "=== Semgrep: static analysis ==="
	npx semgrep --config=p/security-audit src/ supabase/functions/

# Verifica se o build passa
build-check:
	@echo "=== Build check ==="
	npm run build
