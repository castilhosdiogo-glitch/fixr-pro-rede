import { motion } from "framer-motion";
import { Search, BarChart3, MessageSquare } from "lucide-react";

const steps = [
  { icon: Search, title: "Busque", desc: "Encontre profissionais por categoria ou serviço na sua cidade" },
  { icon: BarChart3, title: "Compare", desc: "Veja avaliações reais, experiência e perfis verificados" },
  { icon: MessageSquare, title: "Contrate", desc: "Solicite orçamento direto e combine o serviço" },
];

const HowItWorksSection = () => (
  <section className="px-4 py-10 max-w-lg mx-auto">
    <motion.h2
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="font-display text-lg text-foreground text-center mb-8"
    >
      Como funciona
    </motion.h2>
    <div className="flex flex-col gap-6">
      {steps.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.15 }}
          className="flex items-start gap-4"
        >
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-elevated">
            <item.icon size={20} className="text-primary-foreground" />
          </div>
          <div className="pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Passo {i + 1}</span>
            </div>
            <h3 className="font-display text-base text-foreground mt-0.5">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default HowItWorksSection;
