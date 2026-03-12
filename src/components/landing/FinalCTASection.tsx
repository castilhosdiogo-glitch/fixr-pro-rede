import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase, UserPlus } from "lucide-react";

const FinalCTASection = () => (
  <>
    {/* Professional CTA */}
    <section className="px-4 py-12 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
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
            </Link>
          </div>
        </div>
      </motion.div>
    </section>

    {/* Footer */}
    <footer className="px-4 pb-24 max-w-lg mx-auto">
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
        </p>
      </div>
    </footer>
  </>
);

export default FinalCTASection;
