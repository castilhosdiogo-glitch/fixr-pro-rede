import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, TrendingUp, Zap, Crown, Sparkles, FileText, AlertTriangle, BarChart3 } from "lucide-react";

const plans = [
  {
    name: "Starter",
    icon: TrendingUp,
    price: "Grátis",
    priceAfter: "R$9,90",
    subtitle: "30 dias grátis, depois R$9,90/mês",
    badge: null,
    featured: false,
    benefits: [
      "Criar perfil profissional",
      "Aparecer nas buscas",
      "Receber solicitações básicas",
      "Visibilidade padrão",
    ],
    cta: "Começar Grátis por 30 dias",
    ctaStyle: "border-2 border-border text-foreground hover:border-primary hover:text-primary",
  },
  {
    name: "Profissional",
    icon: Zap,
    price: "R$19,90",
    priceAfter: null,
    subtitle: "/mês",
    badge: "Mais popular",
    featured: true,
    benefits: [
      "Maior visibilidade nas buscas",
      "Receber mais solicitações",
      "Selo Profissional verificado",
      "Estatísticas de perfil",
      "Prioridade no atendimento",
      "Opção de formalização como MEI",
    ],
    cta: "Assinar Profissional",
    ctaStyle: "gradient-cta text-primary-foreground",
  },
  {
    name: "Premium",
    icon: Crown,
    price: "R$39,90",
    priceAfter: null,
    subtitle: "/mês",
    badge: "Hub Fiscal",
    featured: false,
    benefits: [
      "Tudo do Profissional incluído",
      "Ranking prioritário na busca",
      "Selo de destaque no perfil",
      "Perfil em destaque na homepage",
      "Hub Fiscal completo",
      "Acompanhamento do MEI",
      "Alerta de vencimento do DAS",
      "Monitoramento do limite MEI",
    ],
    cta: "Assinar Premium",
    ctaStyle: "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
  },
];

const PricingSection = () => (
  <section className="px-4 py-16 max-w-lg mx-auto" id="planos">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-center mb-10"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
        <Sparkles size={12} />
        Planos para Profissionais
      </div>
      <h2 className="font-display text-2xl text-foreground">
        Cresça no seu ritmo
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Comece grátis por 30 dias. Evolua quando estiver pronto.
      </p>
    </motion.div>

    <div className="flex flex-col gap-4">
      {plans.map((plan, i) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className={`rounded-2xl bg-card p-6 relative overflow-hidden ${
            plan.featured
              ? "shadow-elevated border-2 border-primary"
              : "shadow-card border border-border"
          }`}
        >
          {plan.badge && (
            <div className="absolute top-0 right-0 counter-badge text-primary-foreground px-4 py-1.5 text-xs font-display rounded-bl-2xl">
              {plan.badge}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              plan.featured ? "gradient-primary" : "bg-secondary"
            }`}>
              <plan.icon size={16} className={plan.featured ? "text-primary-foreground" : "text-primary"} />
            </div>
            <h3 className="font-display text-lg text-foreground">{plan.name}</h3>
          </div>

          <div className="flex items-baseline gap-1 mb-1">
            <p className="font-display text-3xl text-foreground">{plan.price}</p>
            {plan.subtitle.startsWith("/") && (
              <span className="text-sm text-muted-foreground">{plan.subtitle}</span>
            )}
          </div>
          {plan.priceAfter && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/20 mb-2">
              <span className="text-primary font-display text-lg font-bold">{plan.priceAfter}</span>
              <span className="text-xs text-muted-foreground">/mês após 30 dias</span>
            </div>
          )}
          {!plan.subtitle.startsWith("/") && (
            <p className="text-xs text-muted-foreground mb-4">{plan.subtitle}</p>
          )}

          <ul className="space-y-2.5 text-sm text-foreground mt-4">
            {plan.benefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-success flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className={`block mt-6 w-full py-3.5 rounded-xl font-display text-sm tracking-wide text-center transition-all duration-300 ${plan.ctaStyle}`}
          >
            {plan.cta}
          </Link>
        </motion.div>
      ))}
    </div>

    {/* Hub Fiscal Highlight */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-8 rounded-2xl bg-card border border-border shadow-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
          <FileText size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground">Hub Fiscal PROFIX</h3>
          <p className="text-xs text-muted-foreground">Exclusivo do plano Premium</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50">
          <BarChart3 size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Acompanhamento MEI</p>
            <p className="text-xs text-muted-foreground">Faturamento e status em tempo real</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50">
          <AlertTriangle size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Alerta DAS</p>
            <p className="text-xs text-muted-foreground">Nunca perca o vencimento</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/50">
          <TrendingUp size={18} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Limite MEI</p>
            <p className="text-xs text-muted-foreground">Monitore seu teto de faturamento</p>
          </div>
        </div>
      </div>
    </motion.div>
  </section>
);

export default PricingSection;
