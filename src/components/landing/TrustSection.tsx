import { motion } from "framer-motion";
import { ShieldCheck, MessageSquareWarning, Lock, UserCheck } from "lucide-react";

const trustItems = [
  {
    icon: UserCheck,
<<<<<<< HEAD
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
=======
    title: "Profissionais Verificados",
    desc: "Cada profissional passa por verificação de identidade e histórico antes de ser listado.",
  },
  {
    icon: Lock,
    title: "Chat Protegido",
    desc: "Toda comunicação acontece dentro da plataforma, protegendo seus dados pessoais.",
  },
  {
    icon: ShieldCheck,
    title: "Proteção da Plataforma",
    desc: "Avaliações reais e monitoramento contínuo garantem a qualidade do serviço.",
  },
  {
    icon: MessageSquareWarning,
    title: "Dados Seguros",
    desc: "Informações de contato só são compartilhadas após a confirmação do serviço.",
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  },
];

const TrustSection = () => (
  <section className="px-4 py-12 max-w-lg mx-auto">
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
<<<<<<< HEAD
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
=======
      className="text-center mb-8"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium mb-3">
        <ShieldCheck size={12} />
        Segurança e Confiança
      </div>
      <h2 className="font-display text-2xl text-foreground">
        Sua segurança em primeiro lugar
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
        Cada detalhe foi pensado para proteger você e garantir serviços de qualidade.
      </p>
    </motion.div>

    <div className="grid grid-cols-2 gap-3">
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      {trustItems.map((item, i) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
<<<<<<< HEAD
          className="rounded-2xl bg-secondary/10 border border-border p-6 flex flex-col items-start gap-4 hover:border-primary transition-colors group"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center border-2 border-primary group-hover:scale-105 transition-transform">
            <item.icon size={20} className="text-primary-foreground" />
          </div>
          <h3 className="font-display font-black text-[10px] uppercase tracking-widest text-foreground leading-tight">{item.title}</h3>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-relaxed opacity-70">{item.desc}</p>
=======
          className="rounded-2xl bg-card shadow-card p-5 flex flex-col items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
            <item.icon size={18} className="text-success" />
          </div>
          <h3 className="font-display text-sm text-foreground leading-tight">{item.title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        </motion.div>
      ))}
    </div>
  </section>
);

export default TrustSection;
