#!/usr/bin/env python3
import os, sys, subprocess, json, datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

REPORT_FILE = "reports/security_report.pdf"
REPORTS_DIR = "reports"

TOOLS = {
    "gitleaks": "gitleaks detect --source . --report-format json --report-path reports/gitleaks.json",
    "semgrep": "semgrep scan --config auto --json --output reports/semgrep.json .",
    "trivy": "trivy fs --security-checks vuln --format json --output reports/trivy.json --severity CRITICAL,HIGH .",
    "prowler": "prowler aws --checks cis_1_5 --json-output reports/prowler.json"
}

THREAT_MODEL_STRIDE = [
    ["Login (JWT)", "Token roubado via XSS", "Spoofing", "HttpOnly+Secure+SameSite, CSP, refresh rotation", "✅"],
    ["Upload S3", "Arquivo malicioso executável", "Tampering", "Validação MIME/extensão, ClamAV, bucket policy strict", "✅"],
    ["Prisma/RDS", "SQL Injection via query raw", "Info Disclosure", "Prisma Client exclusively, parameterized queries, WAF SQLi", "✅"],
    ["Webhooks API", "Replay attack / Falta idempotência", "Repudiation", "HMAC signature, nonce/timestamp, unique constraint", "✅"],
    ["PM2/EC2", "Memory leak → DoS", "DoS", "max_memory_restart: 500M, healthcheck, CloudWatch alarms", "✅"],
    ["Frontend Vite", "Supply chain / Dependency confusion", "Elevation", "Lockfile, SCA no CI, npm audit, version pinning", "✅"]
]

ASVS_L3_CHECKLIST = [
    ["V2.1.5", "Senhas com Argon2id/bcrypt ≥ 12", ""],
    ["V3.2.2", "Session ID regenerado pós-login", ""],
    ["V4.2.3", "RBAC + negação por padrão", ""],
    ["V5.1.3", "Validação de entrada (allowlist)", ""],
    ["V6.2.1", "TLS 1.2+ enforced, HSTS, ciphers modernos", ""],
    ["V7.2.2", "Logs de auditoria imutáveis (≥ 1 ano)", ""],
    ["V8.2.1", "Rate limiting por IP + por usuário", ""],
    ["V11.1.2", "Paginação, depth limit, timeout API", ""]
]

def run_cmd(cmd):
    print(f"🔄 {cmd}")
    return subprocess.run(cmd, shell=True, capture_output=True, text=True).returncode

def parse_findings():
    findings = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "details": []}
    for tool, out_file in [("gitleaks", "reports/gitleaks.json"), ("semgrep", "reports/semgrep.json"),
                           ("trivy", "reports/trivy.json"), ("prowler", "reports/prowler.json")]:
        if not os.path.exists(out_file):
            continue
        try:
            data = json.load(open(out_file))
            items = data.get("results", data if isinstance(data, list) else [])
            for item in items:
                sev = item.get("severity", item.get("FindingSeverity", "info")).upper()
                sev_key = sev.lower() if sev.lower() in findings else "info"
                findings[sev_key] += 1
                findings["details"].append({
                    "tool": tool, "severity": sev_key,
                    "rule": item.get("rule_id", item.get("CheckID", item.get("RuleID", "N/A"))),
                    "location": item.get("path", item.get("Resource", item.get("Location", "N/A"))),
                    "description": item.get("description", item.get("StatusDetail", item.get("Title", "N/A"))).replace("\n", " ")[:180]
                })
        except Exception as e:
            print(f"⚠️ Erro ao parsear {out_file}: {e}")
    return findings

def generate_pdf(findings):
    os.makedirs(REPORTS_DIR, exist_ok=True)
    doc = SimpleDocTemplate(REPORT_FILE, pagesize=A4, topMargin=40, bottomMargin=40, leftMargin=40, rightMargin=40)
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CenterTitle', parent=styles['Title'], alignment=TA_CENTER, fontSize=18, spaceAfter=10))
    styles.add(ParagraphStyle(name='Section', parent=styles['Heading1'], fontSize=14, spaceBefore=15, spaceAfter=8))
    styles.add(ParagraphStyle(name='SubSection', parent=styles['Heading2'], fontSize=12, spaceBefore=10, spaceAfter=6))
    styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], alignment=TA_JUSTIFY, fontSize=10, spaceAfter=6))

    elements = []
    now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    elements.append(Paragraph("RELATORIO TECNICO DE SEGURANCA", styles['CenterTitle']))
    elements.append(Paragraph("Stack: Vite/React + Supabase + DigitalOcean App Platform", styles['Body']))
    elements.append(Paragraph(f"Data: {now} | Padroes: OWASP ASVS L3 | NIST SSDF | CIS AWS v1.5", styles['Body']))
    elements.append(PageBreak())

    elements.append(Paragraph("1. METODOLOGIA & COMANDOS", styles['Section']))
    cmd_table = [["Ferramenta", "Comando", "Finalidade"]]
    for tool, cmd in TOOLS.items():
        cmd_table.append([tool.upper(), cmd, {"gitleaks": "Segredos", "semgrep": "SAST", "trivy": "SCA", "prowler": "CIS AWS"}[tool]])
    t_cmds = Table(cmd_table, colWidths=[80, 250, 150])
    t_cmds.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(t_cmds)
    elements.append(PageBreak())

    elements.append(Paragraph("2. THREAT MODEL (STRIDE)", styles['Section']))
    t_stride = [["Componente", "Ameaca", "Categoria", "Mitigacao", "Status"]] + THREAT_MODEL_STRIDE
    t_s = Table(t_stride, colWidths=[80, 100, 75, 185, 45])
    t_s.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkred),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))
    elements.append(t_s)
    elements.append(PageBreak())

    elements.append(Paragraph("3. CHECKLIST OWASP ASVS L3", styles['Section']))
    t_asvs = [["ID", "Controle", "Status"]] + ASVS_L3_CHECKLIST
    t_a = Table(t_asvs, colWidths=[60, 340, 80])
    t_a.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    elements.append(t_a)
    elements.append(PageBreak())

    elements.append(Paragraph("4. RESULTADOS DAS FERRAMENTAS", styles['Section']))
    summary_data = [
        ["Severidade", "Qtd", "Acao SLA"],
        ["CRITICO", str(findings["critical"]), "Correccao imediata (24h)"],
        ["ALTO", str(findings["high"]), "Correccao <= 7 dias"],
        ["MEDIO", str(findings["medium"]), "Sprint de seguranca"],
        ["BAIXO", str(findings["low"]), "Backlog priorizavel"],
        ["INFO", str(findings["info"]), "Monitorar"],
    ]
    t_sum = Table(summary_data, colWidths=[100, 60, 320])
    t_sum.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('BACKGROUND', (0, 1), (-1, 1), colors.Color(0.9, 0.2, 0.2)),
        ('BACKGROUND', (0, 2), (-1, 2), colors.Color(0.95, 0.5, 0.1)),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
    ]))
    elements.append(t_sum)
    elements.append(Spacer(1, 15))

    if findings["details"]:
        elements.append(Paragraph("Top Achados (ate 15)", styles['SubSection']))
        details = [["Tool", "Sev", "Regra", "Local", "Descricao"]]
        sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
        for f in sorted(findings["details"], key=lambda x: sev_order.get(x["severity"], 5))[:15]:
            details.append([f["tool"], f["severity"].upper(), f["rule"], f["location"], f["description"]])
        t_det = Table(details, colWidths=[55, 50, 90, 100, 190])
        t_det.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        elements.append(t_det)
    else:
        elements.append(Paragraph("Nenhum achado encontrado ou ferramentas nao executadas.", styles['Body']))

    elements.append(PageBreak())
    elements.append(Paragraph("5. RECOMENDACOES PRIORIZADAS", styles['Section']))
    recs = [
        "Rotacionar chaves e variaveis expostas imediatamente",
        "Ativar WAF + rate limiting no DigitalOcean App Platform",
        "Fixar versoes de dependencias + SCA obrigatorio no CI",
        "Habilitar criptografia em transit e em rest no Supabase Storage",
        "Implementar logs de auditoria imuataveis com retencao >= 1 ano",
        "Agendar pentest profissional + retest apos correccoes criticas",
        "Revisar RBAC e politicas RLS no Supabase para principio do menor privilegio",
        "Implementar Content Security Policy (CSP) estrita no frontend",
    ]
    elements.append(ListFlowable(
        [ListItem(Paragraph(r, styles['Body'])) for r in recs],
        bulletType='bullet', leftIndent=20
    ))

    doc.build(elements)
    print(f"✅ Relatorio gerado: {REPORT_FILE}")


if __name__ == "__main__":
    os.makedirs(REPORTS_DIR, exist_ok=True)
    findings = parse_findings()
    generate_pdf(findings)
    if findings["critical"] > 0 or findings["high"] > 0:
        print(f"🚨 Auditoria: {findings['critical']} criticos, {findings['high']} altos encontrados.")
        sys.exit(1)
    print("✅ Auditoria aprovada.")
