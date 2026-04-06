import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, UserPlus } from "lucide-react";

const FinalCTASection = () => (
  <>
    {/* Professional CTA */}
<<<<<<< HEAD
    <section className="px-4 py-20 max-w-lg mx-auto">
=======
    <section className="px-4 py-12 max-w-lg mx-auto">
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
<<<<<<< HEAD
        className="rounded-2xl bg-primary p-12 text-center relative overflow-hidden group shadow-none"
      >
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-8 shadow-none border-2 border-white group-hover:bg-primary transition-colors">
            <Briefcase size={32} className="text-primary group-hover:text-white" />
          </div>
          <h2 className="font-display font-black text-3xl uppercase tracking-tighter text-white mb-4">
            QUER TRABALHAR COM A GENTE?
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-10 max-w-xs mx-auto leading-relaxed">
            CADASTRE SEUS SERVIÇOS EM MINUTOS E COMECE A RECEBER CLIENTES NA SUA REGIÃO.
          </p>
          <div className="flex flex-col gap-4">
            <Link
              to="/auth?tab=register"
              className="inline-flex items-center justify-center gap-4 px-10 py-6 bg-white text-primary font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-black hover:text-white transition-all duration-300 active:scale-[0.98]"
            >
              CRIAR MEU PERFIL
              <UserPlus size={18} />
            </Link>
            <Link
              to="/buscar"
              className="inline-flex items-center justify-center gap-2 text-white/50 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors mt-4"
            >
              OU ENCONTRE UM PROFISSIONAL <ArrowRight size={14} />
=======
        className="rounded-2xl gradient-hero p-8 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative z-10">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-elevated">
            <Briefcase size={24} className="text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl text-primary-foreground mb-2">
            É Profissional?
          </h2>
          <p className="text-sm text-primary-foreground/55 mb-8 max-w-xs mx-auto leading-relaxed">
            Cadastre-se em menos de 2 minutos e comece a receber clientes na sua região.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl gradient-cta text-primary-foreground font-display text-sm tracking-wide hover:scale-[1.02] transition-transform duration-300"
            >
              <UserPlus size={16} />
              Criar Conta Profissional
            </Link>
            <Link
              to="/buscar"
              className="inline-flex items-center justify-center gap-2 text-primary-foreground/50 text-sm hover:text-primary-foreground/70 transition-colors"
            >
              Ou encontre um profissional <ArrowRight size={14} />
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
            </Link>
          </div>
        </div>
      </motion.div>
    </section>

    {/* Footer */}
    <footer className="px-4 pb-24 max-w-lg mx-auto">
<<<<<<< HEAD
      <div className="border-t border-border pt-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-2xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display text-sm font-black">F</span>
          </div>
          <span className="font-display font-black text-xl tracking-tighter text-foreground uppercase">Fixr</span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
          Porto Alegre · Gravataí · Canoas · Cachoeirinha · Viamão · Alvorada
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-6">
          © 2026 Fixr — Plataforma de Serviços
=======
      <div className="border-t border-border pt-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display text-xs font-bold">P</span>
          </div>
          <span className="font-display text-sm text-foreground">PROFIX</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Porto Alegre · Gravataí · Canoas · Cachoeirinha · Viamão · Alvorada
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          © 2026 PROFIX — A Rede dos Profixssionais
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        </p>
      </div>
    </footer>
  </>
);

export default FinalCTASection;
