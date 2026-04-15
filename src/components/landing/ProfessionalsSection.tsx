import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProfessionalCard from "@/components/ProfessionalCard";

const ProfessionalsSection = () => {
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ["professionals-top"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("top_professionals", { _limit: 4 });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((pro: any) => ({
        id: pro.id,
        name: pro.full_name || "Profissional",
        photo: pro.avatar_url || "",
        categoryId: pro.category_id,
        category: pro.category_name,
        city: pro.city || "Local não definido",
        state: pro.state || "RS",
        rating: pro.rating || 0,
        reviewCount: pro.review_count || 0,
        verified: pro.verified || false,
        premium: pro.plan_name === "parceiro",
        description: pro.description || "",
        experience: pro.experience || "N/A",
        phone: pro.phone || "",
        plan_name: pro.plan_name || "explorador",
        nivel_curadoria: pro.nivel_curadoria || "fixr_explorador",
        fixr_score: Number(pro.fixr_score || 0),
        reviews: [],
      }));
    },
  });

  if (isLoading || professionals.length === 0) return null;

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
            <span className="text-xs text-primary font-semibold uppercase tracking-wide">Top Avaliados</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Profissionais na sua Região</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Os melhores avaliados pelos clientes da Fixr</p>
        </div>
      </motion.div>
      <div className="flex flex-col gap-2">
        {professionals.map((prof, i) => (
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
          className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 rounded-2xl border border-border text-xs font-bold tracking-wide text-muted-foreground hover:text-primary hover:border-primary transition-all duration-300"
        >
          Ver todos os profissionais <ArrowRight size={14} />
        </Link>
      </motion.div>
    </section>
  );
};

export default ProfessionalsSection;

