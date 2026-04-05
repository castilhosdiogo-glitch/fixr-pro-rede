import { motion } from "framer-motion";
import { Search, BarChart3, MessageSquare, CheckCircle } from "lucide-react";

const steps = [
  { icon: Search, title: "01. Buscar", desc: "Encontre profissionais por categoria e cidade na sua região", number: "01" },
  { icon: BarChart3, title: "02. Comparar", desc: "Veja avaliações reais e perfis verificados", number: "02" },
  { icon: MessageSquare, title: "03. Conversar", desc: "Envie uma mensagem segura explicando o que você precisa", number: "03" },
  { icon: CheckCircle, title: "04. Contratar", desc: "Confirme o serviço com segurança dentro da plataforma", number: "04" },
];

const HowItWorksSection = () => (
  <section className="px-4 py-12 max-w-lg mx-auto" id="como-funciona">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-left mb-12 pl-4 border-l-4 border-primary"
    >
      <h2 className="font-display font-bold text-xs uppercase tracking-widest text-primary">
        Passo a passo
      </h2>
      <p className="font-display font-extrabold text-2xl tracking-tight text-foreground mt-2">
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
          className="flex items-start gap-6 bg-secondary/10 p-6 border border-border rounded-2xl relative overflow-hidden group hover:border-primary transition-colors"
        >
          <div className="flex-shrink-0 relative">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary group-hover:scale-105 transition-transform duration-300">
              <item.icon size={24} className="text-primary-foreground" />
            </div>
          </div>
          <div className="pt-1">
            <h3 className="font-display font-bold text-sm text-foreground">{item.title}</h3>
            <p className="text-[11px] font-medium text-muted-foreground mt-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </section>
);

export default HowItWorksSection;
