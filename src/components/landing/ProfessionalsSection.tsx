<<<<<<< HEAD
﻿import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProfessionalCard from "@/components/ProfessionalCard";

const ProfessionalsSection = () => {
  const { data: professionals = [], isLoading } = useQuery({
    queryKey: ["professionals-top"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_profiles")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            city,
            state,
            phone
          )
        `)
        .order("rating", { ascending: false })
        .limit(4);

      if (error) throw error;

      return (data || []).map((pro: any) => ({
        id: pro.id,
        name: pro.profiles?.full_name || "Profissional",
        photo: pro.profiles?.avatar_url || "",
        categoryId: pro.category_id,
        category: pro.category_name,
        city: pro.profiles?.city || "Local não definido",
        state: pro.profiles?.state || "RS",
        rating: pro.rating || 0,
        reviewCount: pro.review_count || 0,
        verified: pro.verified || false,
        premium: pro.premium || false,
        description: pro.description || "",
        experience: pro.experience || "N/A",
        phone: pro.profiles?.phone || "",
        reviews: [],
      }));
    },
  });

  if (isLoading || professionals.length === 0) return null;
=======
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
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a

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
<<<<<<< HEAD
            <span className="text-xs text-primary font-semibold uppercase tracking-wide">Top Avaliados</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Profissionais na sua Região</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Os melhores avaliados pelos clientes da Fixr</p>
        </div>
      </motion.div>
      <div className="flex flex-col gap-2">
        {professionals.map((prof, i) => (
=======
            <span className="text-xs text-primary font-medium uppercase tracking-wider">Top Avaliados</span>
          </div>
          <h2 className="font-display text-xl text-foreground">Profissionais em Destaque</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Ranqueados por avaliação, serviços e tempo de resposta</p>
        </div>
      </motion.div>
      <div className="flex flex-col gap-2">
        {topProfessionals.map((prof, i) => (
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
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
<<<<<<< HEAD
          className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 rounded-2xl border border-border text-xs font-bold tracking-wide text-muted-foreground hover:text-primary hover:border-primary transition-all duration-300"
=======
          className="flex items-center justify-center gap-2 w-full mt-4 py-3.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary hover:shadow-card transition-all duration-300"
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        >
          Ver todos os profissionais <ArrowRight size={14} />
        </Link>
      </motion.div>
    </section>
  );
};

export default ProfessionalsSection;
<<<<<<< HEAD

=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
