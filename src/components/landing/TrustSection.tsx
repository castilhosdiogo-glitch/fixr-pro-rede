import { motion } from "framer-motion";
import { ShieldCheck, MessageSquareWarning, Lock, UserCheck } from "lucide-react";

const trustItems = [
  {
    icon: UserCheck,
    title: "PROFISSIONAIS VERIFICADOS",
    desc: "CADA PESSOA PASSA POR UMA VERIFICAÇÃO ANTES DE ENTRAR NA PLATAFORMA.",
  },
  {
    icon: Lock,
    title: "CHAT PROTEGIDO",
    desc: "TODA A CONVERSA ACONTECE AQUI DENTRO, PROTEGENDO SEUS DADOS PESSOAIS.",
  },
  {
    icon: ShieldCheck,
    title: "PROTEÇÃO GARANTIDA",
    desc: "AVALIAÇÕES REAIS E ACOMPANHAMENTO PARA GARANTIR UM BOM SERVIÇO.",
  },
  {
    icon: MessageSquareWarning,
    title: "DADOS SEGUROS",
    desc: "SEU NÚMERO DE TELEFONE SÓ APARECE DEPOIS QUE O SERVIÇO FOR CONFIRMADO.",
  },
];

const TrustSection = () => (
  <section className="px-4 py-12 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="text-left mb-12 pl-4 border-l-4 border-primary"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest mb-4">
        <ShieldCheck size={12} />
        SEGURANÇA E CONFIANÇA
      </div>
      <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground">
        SUA SEGURANÇA EM PRIMEIRO LUGAR
      </h2>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 max-w-xs">
        CADA DETALHE FOI PENSADO PARA TE PROTEGER E GARANTIR UM SERVIÇO DE QUALIDADE.
      </p>
    </motion.div>

    <div className="grid grid-cols-2 gap-4">
      {trustItems.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="rounded-2xl bg-secondary/10 border border-border p-6 flex flex-col items-start gap-4 hover:border-primary transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary group-hover:scale-105 transition-transform">
            <item.icon size={20} className="text-primary-foreground" />
          </div>
          <h3 className="font-display font-black text-[10px] uppercase tracking-widest text-foreground leading-tight">{item.title}</h3>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed opacity-70">{item.desc}</p>
        </motion.div>
      ))}
    </div>
  </section>
);

export default TrustSection;
