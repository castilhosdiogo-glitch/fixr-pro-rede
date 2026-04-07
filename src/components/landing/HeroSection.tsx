import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Drill, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleRegister = () => {
    navigate("/auth", { state: { mode: "register-client" } });
  };

  return (
    <section className="relative px-4 pt-16 pb-24 md:pt-32 md:pb-40 overflow-hidden bg-background">
      {/* Background Shift Architecture - No Gradients */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/20 -skew-x-12 translate-x-1/4 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-start">
        
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-3 px-0 mb-10"
        >
          <div className="w-2 h-10 bg-primary rounded-full"></div>
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            O lugar certo para quem trabalha por conta própria
          </span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="font-display font-extrabold text-5xl sm:text-6xl md:text-[5rem] text-foreground tracking-tight max-w-5xl leading-[1.1]"
        >
          Sua habilidade. <br />
          <span className="text-primary">Nossa conexão.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-10 text-xl sm:text-2xl text-muted-foreground max-w-3xl leading-relaxed border-l-2 border-border pl-8"
        >
          O Fixr é feito para quem quer trabalhar mais e melhor.
          Crie seu perfil em segundos e seja encontrado por clientes que precisam do seu serviço agora.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto"
        >
          <button 
            onClick={handleRegister}
            className="w-full sm:w-auto px-10 py-5 bg-primary text-primary-foreground font-bold text-sm rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-4 group"
          >
            Começar agora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </button>
          
          <button 
            onClick={() => navigate("/buscar")}
            className="w-full sm:w-auto px-10 py-5 bg-secondary text-secondary-foreground font-bold text-sm rounded-2xl hover:bg-secondary/80 transition-all"
          >
            Procurar Profissionais
          </button>
        </motion.div>

        {/* Industrial Trust Indicators */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-24 w-full grid grid-cols-1 md:grid-cols-2 gap-px bg-border"
        >
          <div className="bg-background p-10 flex items-start gap-6 group hover:bg-secondary/10 transition-colors">
            <div className="w-14 h-14 bg-primary/10 flex items-center justify-center text-primary rounded-2xl group-hover:bg-primary group-hover:text-white transition-all">
              <Drill className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-black text-lg uppercase tracking-wider mb-2">Mostre seu Trabalho</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Tenha um perfil que passa confiança para o cliente e receba pedidos de orçamento direto no seu celular.</p>
            </div>
          </div>
          
          <div className="bg-background p-10 flex items-start gap-6 group hover:bg-secondary/10 transition-colors">
            <div className="w-14 h-14 bg-secondary flex items-center justify-center text-white rounded-2xl group-hover:bg-primary transition-all">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-black text-lg uppercase tracking-wider mb-2">Segurança de Verdade</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Negocie direto com o cliente de forma transparente. No Fixr, o seu trabalho é valorizado.</p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default HeroSection;

