import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, TrendingUp, Zap, Sparkles, Mic, Camera, Video, X as XIcon } from "lucide-react";

const plans = [
  {
    name: "Explorador",
    icon: TrendingUp,
    price: "Grátis",
    subtitle: "Estou testando o Fixr",
    badge: null,
    featured: false,
    commission: "15%",
    benefits: [
      { text: "Criar perfil profissional", included: true },
      { text: "Aparecer nas buscas", included: true },
      { text: "Até 8 pedidos por mês", included: true },
      { text: "Chat com texto e fotos", included: true },
      { text: "Avaliações e histórico", included: true },
      { text: "Chat com áudio e vídeo", included: false },
      { text: "Hub Fiscal", included: false },
      { text: "Agenda integrada", included: false },
      { text: "Orçamentos personalizados", included: false },
      { text: "Gestão de equipe", included: false },
      { text: "Portfólio de fotos", included: false },
    ],
    cta: "Começar Grátis",
  },
  {
    name: "Parceiro",
    icon: Zap,
    price: "R$ 29,90",
    subtitle: "Faço parte do Fixr",
    badge: "Parceiro Fixr",
    featured: true,
    commission: "10%",
    benefits: [
      { text: "Pedidos ilimitados", included: true },
      { text: "Topo da busca — destaque máximo", included: true },
      { text: "Chat com texto, fotos, áudio e vídeo", included: true },
      { text: "Hub Fiscal completo", included: true },
      { text: "Alertas DAS e limite MEI", included: true },
      { text: "Agenda integrada", included: true },
      { text: "Orçamentos personalizados", included: true },
      { text: "Gestão de equipe (até 3)", included: true },
      { text: "Portfólio com até 20 fotos", included: true },
      { text: "Relatório mensal de faturamento", included: true },
      { text: "Selo Parceiro Verificado", included: true },
      { text: "Suporte prioritário", included: true },
    ],
    cta: "Quero ser Parceiro",
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
        COMECE GRÁTIS. EVOLUA QUANDO ESTIVER PRONTO.
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
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">{plan.name}</h3>
              <p className="text-[10px] text-muted-foreground font-medium">{plan.subtitle}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="font-display font-black text-4xl text-foreground tracking-tighter">{plan.price}</p>
            {plan.price !== "Grátis" && (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">/mês</span>
            )}
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-6">
            COMISSÃO DE {plan.commission} POR SERVIÇO
          </p>

          <ul className="space-y-3 text-xs font-bold uppercase tracking-widest text-foreground border-t border-border/40 pt-6">
            {plan.benefits.map((b) => (
              <li key={b.text} className={`flex items-center gap-3 ${!b.included ? "opacity-40" : ""}`}>
                {b.included ? (
                  <CheckCircle size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <XIcon size={14} className="text-muted-foreground flex-shrink-0" />
                )}
                <span className="text-[10px]">{b.text.toUpperCase()}</span>
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className={`block mt-8 w-full py-5 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] text-center transition-all active:scale-[0.98] ${
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

    {/* Chat com Mídia Highlight */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-12 rounded-2xl bg-background border-2 border-border p-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
          <Mic size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display font-black text-base uppercase tracking-tighter text-foreground">
            CHAT COM MÍDIA
          </h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
            COMUNIQUE-SE COM FOTOS, ÁUDIO E VÍDEO
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Camera, label: "FOTOS", desc: "Todos os planos", highlight: false },
          { icon: Mic, label: "ÁUDIO", desc: "Plano Parceiro", highlight: true },
          { icon: Video, label: "VÍDEO", desc: "Plano Parceiro", highlight: true },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-4 text-center border ${
              item.highlight ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/10"
            }`}
          >
            <item.icon size={24} className={`mx-auto mb-2 ${item.highlight ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground">{item.label}</p>
            <p className="text-[8px] font-bold text-muted-foreground mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default PricingSection;
