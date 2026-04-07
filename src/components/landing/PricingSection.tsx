import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle, TrendingUp, Zap, Crown, Sparkles,
  FileText, AlertTriangle, BarChart3, Mic, Camera,
  Video, Calendar, ClipboardList, Users, Images, Bell,
} from "lucide-react";

const plans = [
  {
    name: "Explorador",
    icon: TrendingUp,
    price: "Grátis",
    priceAfter: null,
    subtitle: "Para começar na plataforma",
    badge: null,
    featured: false,
    commission: "15%",
    benefits: [
      "Até 8 pedidos por mês",
      "Chat de texto",
      "Perfil na busca (sem destaque)",
      "Comissão de 15%",
    ],
    cta: "Começar Grátis",
  },
  {
    name: "Parceiro",
    icon: Zap,
    price: "R$19,90",
    priceAfter: null,
    subtitle: "/mês",
    badge: "Mais popular",
    featured: true,
    commission: "12%",
    benefits: [
      "Pedidos ilimitados",
      "Chat: texto + áudio + foto",
      "Hub Fiscal completo (NFS-e + DAS + MEI)",
      "Destaque na busca",
      "Selo Parceiro Verificado",
      "Estatísticas de desempenho",
      "Suporte prioritário",
      "Comissão de 12%",
    ],
    cta: "Assinar Parceiro",
  },
  {
    name: "Elite",
    icon: Crown,
    price: "R$39,90",
    priceAfter: null,
    subtitle: "/mês",
    badge: "Elite",
    featured: false,
    commission: "10%",
    benefits: [
      "Tudo do Parceiro incluído",
      "Chat: texto + áudio + foto + vídeo (30s)",
      "Agenda integrada no perfil público",
      "Orçamento personalizado no app",
      "Gestão de equipe (até 3 colaboradores)",
      "Portfólio público de fotos",
      "Alerta de limite MEI em tempo real",
      "Relatório mensal de faturamento",
      "Topo absoluto na busca + destaque na homepage",
      "Selo Elite com badge dourado",
      "Comissão de 10%",
    ],
    cta: "Assinar Elite",
  },
];

const eliteFeatures = [
  { icon: Calendar, title: "AGENDA INTEGRADA", desc: "Clientes agendam direto no seu perfil público" },
  { icon: ClipboardList, title: "ORÇAMENTO NO APP", desc: "Envie orçamentos detalhados e receba aprovação com um toque" },
  { icon: Users, title: "GESTÃO DE EQUIPE", desc: "Cadastre até 3 colaboradores no seu perfil" },
  { icon: Images, title: "PORTFÓLIO PÚBLICO", desc: "Galeria de até 20 fotos dos seus serviços realizados" },
  { icon: Bell, title: "ALERTA MEI", desc: "Notificação ao atingir 70%, 90% e 100% do limite anual" },
];

const chatFeatures = [
  { icon: Mic, label: "ÁUDIO", desc: "Parceiro + Elite", color: "text-blue-400" },
  { icon: Camera, label: "FOTO", desc: "Parceiro + Elite", color: "text-green-400" },
  { icon: Video, label: "VÍDEO 30s", desc: "Somente Elite", color: "text-primary" },
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
            plan.name === "Elite"
              ? "border-yellow-500/60 shadow-none"
              : plan.featured
              ? "border-primary shadow-none"
              : "border-border shadow-none"
          }`}
        >
          {plan.badge && (
            <div className={`absolute top-0 right-0 px-4 py-2 text-[9px] font-black uppercase tracking-widest ${
              plan.name === "Elite"
                ? "bg-yellow-500 text-black"
                : "bg-primary text-primary-foreground"
            }`}>
              {plan.badge.toUpperCase()}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
              plan.name === "Elite"
                ? "bg-yellow-500/10 border-yellow-500/60"
                : plan.featured
                ? "bg-primary border-primary"
                : "bg-background border-border"
            }`}>
              <plan.icon size={20} className={
                plan.name === "Elite" ? "text-yellow-500" :
                plan.featured ? "text-primary-foreground" : "text-primary"
              } />
            </div>
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">
                {plan.name}
              </h3>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                COMISSÃO {plan.commission}
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <p className="font-display font-black text-4xl text-foreground tracking-tighter">{plan.price}</p>
            {plan.subtitle.startsWith("/") && (
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{plan.subtitle}</span>
            )}
          </div>
          {!plan.subtitle.startsWith("/") && (
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
              {plan.subtitle.toUpperCase()}
            </p>
          )}

          <ul className="space-y-3.5 text-xs font-black uppercase tracking-widest text-foreground mt-8 border-t border-border/40 pt-8">
            {plan.benefits.map((b) => (
              <li key={b} className="flex items-center gap-4">
                <CheckCircle size={16} className={
                  plan.name === "Elite" ? "text-yellow-500 flex-shrink-0" : "text-primary flex-shrink-0"
                } />
                {b.toUpperCase()}
              </li>
            ))}
          </ul>

          <Link
            to="/auth"
            className={`block mt-10 w-full py-5 rounded-2xl font-display font-black text-xs uppercase tracking-[0.3em] text-center transition-all active:scale-[0.98] ${
              plan.name === "Elite"
                ? "bg-yellow-500 text-black hover:bg-yellow-400"
                : plan.featured
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-2 border-border text-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {plan.cta.toUpperCase()}
          </Link>
        </motion.div>
      ))}
    </div>

    {/* Chat com mídia */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-10 rounded-2xl bg-background border-2 border-border p-8"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-border flex items-center justify-center">
          <Mic size={22} className="text-primary" />
        </div>
        <div>
          <h3 className="font-display font-black text-lg uppercase tracking-tighter text-foreground">CHAT COM MÍDIA</h3>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">COMUNICAÇÃO PROFISSIONAL COMPLETA</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {chatFeatures.map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="flex flex-col items-center gap-2 p-4 bg-secondary/10 border border-border rounded-xl text-center">
            <Icon size={20} className={color} />
            <p className="text-[9px] font-black uppercase tracking-widest text-foreground">{label}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">{desc}</p>
          </div>
        ))}
      </div>
    </motion.div>

    {/* Hub Fiscal */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-6 rounded-2xl bg-background border-2 border-primary p-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary">
          <FileText size={28} className="text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">HUB FISCAL FIXR</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">PARCEIRO + ELITE</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {[
          { icon: BarChart3, title: "EMISSÃO DE NFS-e", desc: "Nota fiscal de serviço eletrônica integrada" },
          { icon: AlertTriangle, title: "ALERTA DA GUIA DAS", desc: "Nunca mais esqueça de pagar seu MEI" },
          { icon: TrendingUp, title: "GUIA MEI ASSISTIDO", desc: "Passo a passo para formalização como MEI" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 p-5 bg-secondary/10 border border-border hover:border-primary transition-colors rounded-xl">
            <Icon size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{title}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-70">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>

    {/* Features Elite */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mt-6 rounded-2xl bg-background border-2 border-yellow-500/60 p-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border-2 border-yellow-500/60">
          <Crown size={28} className="text-yellow-500" />
        </div>
        <div>
          <h3 className="font-display font-black text-xl uppercase tracking-tighter text-foreground">EXCLUSIVO ELITE</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mt-1">RECURSOS AVANÇADOS PARA CRESCER MAIS</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {eliteFeatures.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-4 p-5 bg-secondary/10 border border-border hover:border-yellow-500/60 transition-colors rounded-xl">
            <Icon size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{title}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-70">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default PricingSection;
