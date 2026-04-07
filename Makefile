SHELL := /bin/bash
REPORTS_DIR := reports
PYTHON := python3

.PHONY: install secrets sast sca cloud audit all clean

install:
	$(PYTHON) -m pip install --user reportlab semgrep prowler
	@echo "⬇️  Instalando gitleaks..."
	@curl -sL https://github.com/gitleaks/gitleaks/releases/download/v8.21.0/gitleaks_8.21.0_linux_x64.tar.gz | tar -xzf - -C /usr/local/bin gitleaks || \
		(mkdir -p ~/.local/bin && curl -sL https://github.com/gitleaks/gitleaks/releases/download/v8.21.0/gitleaks_8.21.0_linux_x64.tar.gz | tar -xzf - -C ~/.local/bin gitleaks)
	@echo "⬇️  Instalando trivy..."
	@curl -sL https://github.com/aquasecurity/trivy/releases/download/v0.59.0/trivy_0.59.0_Linux-64bit.tar.gz | tar -xzf - -C /usr/local/bin trivy || \
		(mkdir -p ~/.local/bin && curl -sL https://github.com/aquasecurity/trivy/releases/download/v0.59.0/trivy_0.59.0_Linux-64bit.tar.gz | tar -xzf - -C ~/.local/bin trivy)
	@mkdir -p $(REPORTS_DIR)
	@echo "✅ Dependências instaladas."

$(REPORTS_DIR):
	mkdir -p $(REPORTS_DIR)

secrets: $(REPORTS_DIR)
	@echo "🔍 Verificando segredos com gitleaks..."
	@gitleaks detect --source . --report-format json --report-path $(REPORTS_DIR)/gitleaks.json --redact --no-git 2>/dev/null || true
	@echo "✅ gitleaks concluído."

sast: $(REPORTS_DIR)
	@echo "🔍 Analisando código com semgrep..."
	@semgrep scan --config=p/security-audit src/ supabase/functions/ --json --output $(REPORTS_DIR)/semgrep.json 2>/dev/null || \
		semgrep scan --config auto --json --output $(REPORTS_DIR)/semgrep.json . 2>/dev/null || true
	@echo "✅ semgrep concluído."

sca: $(REPORTS_DIR)
	@echo "🔍 Verificando dependências com trivy..."
	@trivy fs --security-checks vuln --format json --output $(REPORTS_DIR)/trivy.json --severity CRITICAL,HIGH . 2>/dev/null || \
		trivy fs --scanners vuln --format json --output $(REPORTS_DIR)/trivy.json --severity CRITICAL,HIGH . 2>/dev/null || true
	@echo "✅ trivy concluído."

cloud: $(REPORTS_DIR)
	@echo "🔍 Auditando AWS com prowler..."
	@prowler aws --checks cis_1_5 --json-output $(REPORTS_DIR)/prowler.json 2>/dev/null || \
		echo "⚠️  prowler: sem credenciais AWS configuradas — pulando."

audit: $(REPORTS_DIR)
	@echo "📊 Gerando relatório PDF..."
	$(PYTHON) scripts/security-audit.py

all: secrets sast sca cloud audit

clean:
	rm -rf $(REPORTS_DIR)/*.json $(REPORTS_DIR)/security_report.pdf
	@echo "🧹 Relatórios limpos."
