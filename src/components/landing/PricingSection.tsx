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
      className="text-left mb-12 pl-4 border-l-4 border-primary"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest mb-4">
        <Sparkles size={12} />
        PLANOS PARA PROFISSIONAIS
      </div>
      <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground">
        CRESÇA O SEU NEGÓCIO
      </h2>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 max-w-xs">
        COMECE GRÁTIS POR 30 DIAS. EVOLUA QUANDO ESTIVER PRONTO.
      </p>
    </motion.div>

    <div className="flex flex-col gap-6">
      {plans.map((plan, i) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className={`rounded-2xl bg-secondary/10 p-8 relative overflow-hidden border-2 ${
            plan.featured
              ? "border-primary shadow-none"
              : "border-border shadow-none"
          }`}
        >
          {plan.badge && (
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-2 text-[9px] font-black uppercase tracking-widest">
              {plan.badge.toUpperCase()}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
              plan.featured ? "bg-primary border-primary" : "bg-background border-border"
            }`}>
              <plan.icon size={20} className={plan.featured ? "text-primary-foreground" : "text-primary"} />
            </div>
            <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">{plan.name}</h3>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="font-display font-black text-4xl text-foreground tracking-tighter">{plan.price}</p>
            {plan.subtitle.startsWith("/") && (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{plan.subtitle}</span>
            )}
          </div>
          {plan.priceAfter && (
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 mb-4">
              <span className="text-primary font-display font-black text-lg">{plan.priceAfter}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">/MÊS APÓS 30 DIAS</span>
            </div>
          )}
          {!plan.subtitle.startsWith("/") && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6">{plan.subtitle.toUpperCase()}</p>
          )}

          <ul className="space-y-3.5 text-xs font-black uppercase tracking-widest text-foreground mt-8 border-t border-border/40 pt-8">
            {plan.benefits.map((b) => (
              <li key={b} className="flex items-center gap-4">
                <CheckCircle size={16} className="text-primary flex-shrink-0" />
                {b.toUpperCase()}
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className={`block mt-10 w-full py-5 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] text-center transition-all active:scale-[0.98] ${
              plan.featured 
                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                : "border-2 border-border text-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {plan.cta.toUpperCase()}
          </Link>
        </motion.div>
      ))}
    </div>

    {/* Hub Fiscal Highlight */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12 rounded-2xl bg-background border-2 border-primary p-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary">
          <FileText size={28} className="text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">APOIO AO MEI Fixr</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">AJUDA EXCLUSIVA DO PLANO PREMIUM</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-start gap-4 p-5 bg-secondary/10 border border-border group hover:border-primary transition-colors">
          <BarChart3 size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">ACOMPANHAMENTO MEI</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-70">VEJA SEU FATURAMENTO DE FORMA SIMPLES</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-5 bg-secondary/10 border border-border group hover:border-primary transition-colors">
          <AlertTriangle size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">ALERTA DA GUIA DAS</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-70">NUNCA MAIS ESQUEÇA DE PAGAR SEU MEI</p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-5 bg-secondary/10 border border-border group hover:border-primary transition-colors">
          <TrendingUp size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">LIMITE DO MEI</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-70">AVISAMOS QUANDO ESTIVER PERTO DO LIMITE ANUAL</p>
          </div>
        </div>
      </div>
    </motion.div>
  </section>
);

export default PricingSection;

