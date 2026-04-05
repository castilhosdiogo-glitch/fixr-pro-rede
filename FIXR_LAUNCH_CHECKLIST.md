# ✅ Fixr Launch Checklist — Antes de Ir ao Ar

**Objetivo:** Garantir que tudo está 100% pronto antes do lançamento  
**Tempo:** ~2-4 horas  
**Status:** Critical

---

## 📋 PRÉ-LANÇAMENTO (1-2 semanas antes)

### ✅ CÓDIGO
- [ ] Todos testes passando (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Lint sem warnings (`npm run lint`)
- [ ] Variáveis de ambiente documentadas
- [ ] Secrets não estão no código
- [ ] README.md atualizado
- [ ] .gitignore correto (sem .env)

### ✅ BANCO DE DADOS
- [ ] Migrations executadas com sucesso
- [ ] Seed data (usuários teste) criada
- [ ] Backups automáticos configurados (7 dias)
- [ ] Indexes criados para queries lentas
- [ ] RLS policies testadas
- [ ] Conexão PostgreSQL verificada

### ✅ SEGURANÇA
- [ ] JWT secrets gerados e seguros (32+ chars)
- [ ] AWS credentials com permissões mínimas (não admin)
- [ ] Firebase FCM credenciais corretas
- [ ] CORS configurado (apenas domínios confiáveis)
- [ ] Rate limiting ativado
- [ ] Headers de segurança (helmet)
- [ ] SSL/HTTPS configurado
- [ ] Senhas hasheadas (bcrypt)
- [ ] Variáveis sensíveis em .env (não no código)

### ✅ PERFORMANCE
- [ ] Database queries otimizadas (< 200ms)
- [ ] N+1 queries verificadas
- [ ] Índices no PostgreSQL criados
- [ ] Cache (Redis) configurado se aplicável
- [ ] Bundle size checado
- [ ] Imagens otimizadas
- [ ] CDN configurado (se houver)

### ✅ NOTIFICAÇÕES & EMAILS
- [ ] Firebase FCM configurado
- [ ] Push notifications testadas
- [ ] Email SMTP configurado
- [ ] Email templates prontos
- [ ] Unsubscribe links funcionam

### ✅ UPLOADS (S3)
- [ ] Bucket S3 criado e configurado
- [ ] CORS policy configurada
- [ ] Access keys geradas
- [ ] Limites de arquivo definidos:
  - [ ] Áudio: 5MB máx
  - [ ] Foto: 10MB máx
  - [ ] Vídeo: 50MB máx
- [ ] Política de retenção definida
- [ ] Backup S3 configurado

### ✅ INFRAESTRUTURA
- [ ] EC2 rodando e monitorado
- [ ] PostgreSQL rodando e monitorado
- [ ] Security groups configurados corretamente
- [ ] Elastic IP atribuído (não vai mudar)
- [ ] Auto-restart configurado (PM2)
- [ ] Logs centralizados (CloudWatch ou similar)
- [ ] Alertas configurados

---

## 🧪 TESTING (3-5 dias antes)

### ✅ TESTES FUNCIONAIS
- [ ] Cadastro de usuário (cliente + profissional)
- [ ] Login/logout funciona
- [ ] JWT refresh token funciona
- [ ] Criar pedido completo
- [ ] Chat texto funciona
- [ ] Chat áudio funciona (Parceiro+)
- [ ] Chat foto funciona (Parceiro+)
- [ ] Chat vídeo funciona (Elite)
- [ ] Upload para S3 funciona
- [ ] NFS-e pode ser gerada
- [ ] Pagamento fluxo completo
- [ ] Avaliação funciona
- [ ] Planos limitam recursos corretamente

### ✅ TESTES DE SEGURANÇA
- [ ] SQL injection testado (não funciona)
- [ ] XSS testado (não funciona)
- [ ] CSRF protection ativada
- [ ] Rate limiting funciona
- [ ] Não consegue acessar dados de outro usuário
- [ ] Tokens JWT expiram corretamente
- [ ] Senha não é logada
- [ ] CPF/CNPJ mascarado em logs

### ✅ TESTES DE PERFORMANCE
- [ ] Página carrega em < 3s
- [ ] API responde em < 500ms (normal)
- [ ] Uploads completam em tempo razoável
- [ ] Load test: 10 usuários simultâneos OK
- [ ] Load test: 50 usuários simultâneos OK
- [ ] Sem memory leaks (rodar 24h test)

### ✅ TESTES DE COMPATIBILIDADE
- [ ] iOS (iPhone 12+)
- [ ] Android (Android 10+)
- [ ] Chrome (últimas 2 versões)
- [ ] Safari (últimas 2 versões)
- [ ] Firefox (últimas 2 versões)
- [ ] Tablets (iPad, Galaxy Tab)
- [ ] Telas menores (320px)
- [ ] Telas maiores (1440px+)
- [ ] Velocidades internet lenta (3G)

### ✅ TESTES DE INTEGRAÇÃO
- [ ] AWS S3 upload/download funciona
- [ ] Firebase FCM notificações chegam
- [ ] Banco PostgreSQL persiste dados
- [ ] Backups automáticos funcionam
- [ ] Email transacional funciona

---

## 🚀 DIA DO LANÇAMENTO (Manhã)

### ✅ PREPARAÇÃO FINAL
- [ ] Todos no time informados do horário
- [ ] Suporte online e responsivo
- [ ] Documentação de apoio preparada
- [ ] FAQ preparado
- [ ] Comunicação redes sociais pronta
- [ ] Email para usuários beta preparado

### ✅ SISTEMA PRONTO
- [ ] Servidor EC2 testado 100%
- [ ] PostgreSQL backup feito
- [ ] S3 sincronizado
- [ ] Firebase FCM testado
- [ ] Logs sendo coletados
- [ ] Monitoramento ativo
- [ ] Alertas configurados

### ✅ DADOS CRÍTICOS ACESSÍVEIS
- [ ] SSH key (fixr-prod-key.pem) em local seguro
- [ ] Database password anotado
- [ ] AWS credentials anotadas
- [ ] Firebase credentials anotadas
- [ ] IP Público do EC2 anotado
- [ ] Plano de rollback documentado

---

## 🎬 DURANTE LANÇAMENTO (Primeiras 24h)

### ✅ MONITORAMENTO CADA HORA
- [ ] [ 1h] Sistema rodando sem erros
- [ ] [ 2h] Usuários conseguem se registrar
- [ ] [ 3h] Primeiros pedidos criados
- [ ] [ 4h] Chat funcionando
- [ ] [ 5h] Uploads funcionando
- [ ] [ 6h] Pagamentos processando
- [ ] [ 8h] Performance OK
- [ ] [12h] Zero crashes
- [ ] [24h] Tudo estável

### ✅ ALERTAS MONITORADOS
- [ ] Logs de erro zerados (ou mínimos)
- [ ] Performance dentro do esperado
- [ ] Database não está full
- [ ] S3 não com quota excedida
- [ ] Custos dentro do free tier
- [ ] Sem picos anormais de tráfego

### ✅ FEEDBACK DO USUÁRIO
- [ ] Coletando feedback
- [ ] Reportando bugs
- [ ] Respondendo dúvidas
- [ ] Documentando problemas

---

## 🔧 PÓS-LANÇAMENTO (24-72h)

### ✅ ANÁLISE
- [ ] Revisar logs de erros
- [ ] Analisar performance
- [ ] Coletar feedback usuários
- [ ] Verificar métricas de uso
- [ ] Checar custo AWS (deve ser R$ 0)

### ✅ CORREÇÕES RÁPIDAS
- [ ] Bugs críticos corrigidos e deployados
- [ ] Performance issues resolvidos
- [ ] UX issues documentados
- [ ] Features solicitadas documentadas

### ✅ DOCUMENTAÇÃO
- [ ] Atualizar README com status
- [ ] Documentar problemas encontrados
- [ ] Documentar soluções
- [ ] Criar runbook de operação

---

## 📊 CHECKLIST DE CUSTO

```
Verificar que tudo está GRÁTIS:

☑️ EC2 t2.micro: 750h/mês = GRÁTIS
☑️ RDS PostgreSQL: 750h/mês = GRÁTIS
☑️ S3 5GB: GRÁTIS primeiro ano
☑️ S3 20k GET + 2k PUT: GRÁTIS
☑️ Transferência dados: GRÁTIS (mesma região)
☑️ Firebase FCM: GRÁTIS
☑️ Vercel (frontend): GRÁTIS

TOTAL: R$ 0 ✅

Se aparecer custo:
❌ PARAR tudo
❌ Revisar configurações
❌ Procurar o que está errado
```

---

## 🆘 PLANO DE EMERGÊNCIA

### Se o servidor cair
```bash
# Reconectar via SSH
ssh -i fixr-prod-key.pem ubuntu@[IP]

# Verificar PM2
pm2 status

# Se app está down
pm2 restart fixr-api

# Se não funciona, ver logs
pm2 logs fixr-api --lines 100

# Se EC2 inteiro caiu
# AWS Console → EC2 → Reboot Instance
```

### Se banco de dados cair
```
AWS Console → RDS → Databases → fixr-prod-db
→ Ações → Reboot DB Instance
```

### Se não conseguir acessar
```
1. Verificar security groups
   AWS Console → EC2 → Security Groups
   
2. Verificar IP Public não mudou
   AWS Console → EC2 → Instances
   
3. Se IP mudou (e você não quer):
   AWS Console → Elastic IPs → Allocate
   → Associate com sua instância
```

### Rollback rápido
```bash
# Se novo deploy quebrou:
git revert [commit-hash]
git push
# EC2 detecta e faz deploy automático

# Ou manualmente:
cd /home/ubuntu/fixr
git checkout [commit-anterior]
npm run build
pm2 restart fixr-api
```

---

## 📞 CONTATOS DE SUPORTE (Ter salvos)

```
AWS Support:
└─ https://console.aws.amazon.com/support

Firebase Console:
└─ https://console.firebase.google.com

GitHub Status:
└─ https://www.githubstatus.com

Seu próprio suporte:
├─ Email:
├─ Telefone:
└─ WhatsApp:
```

---

## ✅ FINAL CHECKLIST

```
Antes de clicar em LAUNCH:

☑️ Código testado 100%
☑️ Banco pronto 100%
☑️ Segurança 100%
☑️ Performance OK
☑️ Suporte online
☑️ Documentação pronta
☑️ Plano de rollback pronto
☑️ Alertas configurados
☑️ Logs coletando
☑️ Backup feito

SE TUDO MARCADO:
→ 🚀 LANÇA AGORA!
```

---

**Status:** ✅ Pronto para lançar  
**Última atualização:** 2026-04-05  
**Próximo:** Monitorar 24h
