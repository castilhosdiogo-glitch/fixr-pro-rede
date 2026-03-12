import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, TrendingUp, Zap, Crown, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Gratuito",
    icon: TrendingUp,
    price: "Grátis",
    subtitle: "Para começar na plataforma",
    badge: null,
    featured: false,
    benefits: [
      "Criar perfil profissional",
      "Aparecer nas buscas",
      "Receber solicitações básicas",
      "Visibilidade padrão",
    ],
    cta: "Começar Grátis",
    ctaStyle: "border-2 border-border text-foreground hover:border-primary hover:text-primary",
  },
  {
    name: "Profissional",
    icon: Zap,
    price: "R$29",
    subtitle: "/mês",
    badge: "Mais popular",
    featured: true,
    benefits: [
      "Maior visibilidade nas buscas",
      "Receber mais solicitações",
      "Selo Profissional verificado",
      "Estatísticas de perfil",
      "Prioridade no atendimento",
    ],
    cta: "Assinar Profissional",
    ctaStyle: "gradient-cta text-primary-foreground",
  },
  {
    name: "Destaque",
    icon: Crown,
    price: "R$59",
    subtitle: "/mês",
    badge: null,
    featured: false,
    benefits: [
      "Tudo do Profissional incluído",
      "Ranking prioritário na busca",
      "Selo de destaque no perfil",
      "Posição premium nos resultados",
      "Perfil em destaque na homepage",
    ],
    cta: "Assinar Destaque",
    ctaStyle: "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
  },
];

const PricingSection = () => (
  <section className="px-4 py-12 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-center mb-8"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
        <Sparkles size={12} />
        Planos para Profissionais
      </div>
      <h2 className="font-display text-2xl text-foreground">
        Cresça no seu ritmo
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Comece grátis. Evolua quando estiver pronto.
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
  </section>
);

export default PricingSection;
