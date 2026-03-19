import { motion } from "framer-motion";
import { Search, BarChart3, MessageSquare, CheckCircle } from "lucide-react";

const steps = [
  { icon: Search, title: "Busque", desc: "Encontre profissionais por categoria e cidade na sua região", number: "01" },
  { icon: BarChart3, title: "Compare", desc: "Veja avaliações reais, métricas de serviço e perfis verificados", number: "02" },
  { icon: MessageSquare, title: "Converse", desc: "Envie uma mensagem protegida e descreva o que você precisa", number: "03" },
  { icon: CheckCircle, title: "Contrate", desc: "Confirme o serviço com segurança dentro da plataforma", number: "04" },
];

const HowItWorksSection = () => (
  <section className="px-4 py-12 max-w-lg mx-auto" id="como-funciona">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-center mb-8"
    >
      <h2 className="font-display text-2xl text-foreground">
        Como funciona
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Simples, rápido e seguro
      </p>
    </motion.div>
    <div className="flex flex-col gap-5">
      {steps.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.12 }}
          className="flex items-start gap-4"
        >
          <div className="flex-shrink-0 relative">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-elevated">
              <item.icon size={20} className="text-primary-foreground" />
            </div>
            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[9px] font-display font-bold">
              {item.number}
            </span>
          </div>
          <div className="pt-1.5">
            <h3 className="font-display text-base text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default HowItWorksSection;
