import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { professionals } from "@/data/mock";
import ProfessionalCard from "@/components/ProfessionalCard";

const ProfessionalsSection = () => {
  // Ranking: rating * weight + reviewCount * weight (simulating algorithm)
  const topProfessionals = [...professionals]
    .sort((a, b) => {
      const scoreA = a.rating * 10 + a.reviewCount * 0.1 + (a.premium ? 5 : 0);
      const scoreB = b.rating * 10 + b.reviewCount * 0.1 + (b.premium ? 5 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  return (
    <section className="px-4 py-10 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-primary" />
            <span className="text-xs text-primary font-medium uppercase tracking-wider">Top Avaliados</span>
          </div>
          <h2 className="font-display text-xl text-foreground">Profissionais em Destaque</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ranqueados por avaliação, serviços e tempo de resposta</p>
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
