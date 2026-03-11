import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const FinalCTASection = () => (
  <>
    {/* Final CTA */}
    <section className="px-4 py-10 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="rounded-2xl gradient-hero p-8 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
        <div className="relative z-10">
          <h2 className="font-display text-2xl text-primary-foreground mb-2">
            É Profissional?
          </h2>
          <p className="text-sm text-primary-foreground/60 mb-6 max-w-xs mx-auto leading-relaxed">
            Cadastre-se agora e comece a receber clientes na sua região. Vagas limitadas!
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl gradient-cta text-primary-foreground font-display text-sm tracking-wide hover:scale-105 transition-transform duration-300"
          >
            Criar Conta Grátis <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>

    {/* Footer */}
    <section className="px-4 pb-8 max-w-lg mx-auto text-center">
      <p className="text-xs text-muted-foreground">
        Disponível em Porto Alegre · Gravataí · Canoas · Cachoeirinha · Viamão · Alvorada
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        © 2026 PROFIX — Conectando profissionais e clientes
      </p>
    </section>
  </>
);

export default FinalCTASection;
