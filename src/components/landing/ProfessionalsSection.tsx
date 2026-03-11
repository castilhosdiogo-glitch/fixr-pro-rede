import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { professionals } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";

const ProfessionalsSection = () => {
  const topProfessionals = professionals
    .filter((p) => p.premium || p.rating >= 4.8)
    .slice(0, 4);

  return (
    <section className="px-4 py-4 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <h2 className="font-display text-lg text-foreground">Em Destaque</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Profissionais avaliados e verificados</p>
        </div>
      </motion.div>
      <div className="flex flex-col gap-2">
        {topProfessionals.map((prof, i) => (
          <ProfessionalCard key={prof.id} professional={prof} index={i} />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <Link
          to="/buscar"
          className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary hover:shadow-card transition-all duration-300"
        >
          Ver todos os profissionais <ArrowRight size={14} />
        </Link>
      </motion.div>
    </section>
  );
};

export default ProfessionalsSection;
