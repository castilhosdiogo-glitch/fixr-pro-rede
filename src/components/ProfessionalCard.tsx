<<<<<<< HEAD
import { Star, MapPin, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Professional } from "@/data/mock";
import TrustScoreBadge from "@/components/reputation/TrustScoreBadge";
import { VerificationIcon } from "@/components/reputation/VerificationBadge";
import ReputationTags from "@/components/reputation/ReputationTags";
import { useProfessionalReputation } from "@/hooks/useReputation";
=======
import { Star, ShieldCheck, Crown, MapPin, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Professional } from "@/data/mock";
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a

interface ProfessionalCardProps {
  professional: Professional;
  index?: number;
}

const ProfessionalCard = ({ professional, index = 0 }: ProfessionalCardProps) => {
<<<<<<< HEAD
  const { user } = useAuth();
  const { data: reputation } = useProfessionalReputation(professional.id);

=======
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  const initials = professional.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

<<<<<<< HEAD
=======
  const avatarColors = [
    "from-primary to-primary-glow",
    "from-accent to-primary",
    "from-success to-accent",
    "from-primary-glow to-primary",
  ];

  const colorClass = avatarColors[index % avatarColors.length];

>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div
<<<<<<< HEAD
        className="block rounded-2xl bg-card border-2 border-border hover:border-primary transition-colors overflow-hidden group shadow-none"
      >
        <Link to={`/profissional/${professional.id}`} className="block">
          <div className="flex gap-4 p-4 pb-2">
            {/* Avatar with trust score overlay */}
            <div className="relative flex-shrink-0">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground font-display font-black text-2xl uppercase border-2 border-primary">
                {initials}
              </div>
              {reputation && (
                <div className="absolute -bottom-2 -right-2">
                  <TrustScoreBadge
                    score={reputation.trust_score}
                    level={reputation.verification_level}
                    size="sm"
                    animated={false}
                  />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-black text-base uppercase tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {professional.name}
                </h3>
                {reputation && (
                  <VerificationIcon level={reputation.verification_level} />
                )}
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1 opacity-80">
                {professional.category.toUpperCase()} // XP: {professional.experience.toUpperCase()}
              </p>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 px-2 py-0.5 bg-secondary/20 border-b-2 border-primary">
                  <Star size={10} className="text-primary" fill="currentColor" />
                  <span className="text-[10px] font-black text-foreground tracking-tighter">
                    {professional.rating.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-black uppercase text-muted-foreground/60 ml-0.5">
                    [{professional.reviewCount}]
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  <MapPin size={10} className="text-primary" />
                  {professional.city.toUpperCase()}
                </div>
              </div>

              {/* Reputation tags */}
              {reputation && reputation.tags.length > 0 && (
                <ReputationTags tags={reputation.tags} maxVisible={2} className="mt-2" />
              )}
            </div>
          </div>
        </Link>
        
        {/* Actions */}
        <div className="px-4 pb-4">
          <Link
            to={professional.id ? `/solicitar?pro=${professional.id}&cat=${professional.categoryId ?? ""}` : "/auth"}
            className="w-full flex items-center justify-center gap-3 py-3 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground rounded-xl border border-border hover:border-primary transition-all active:scale-[0.98] group/btn"
          >
            <MessageSquare size={14} className="group-hover/btn:animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
              {user ? "SOLICITAR AGORA" : "ENTRAR PARA SOLICITAR"}
            </span>
          </Link>
=======
        className="block rounded-xl bg-card shadow-card transition-all duration-300 overflow-hidden"
      >
        <div className="flex gap-4 p-4">
          {/* Avatar */}
          <div className={`relative flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} text-primary-foreground font-display text-lg uppercase shadow-sm`}>
            {initials}
            {professional.premium && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary flex items-center justify-center shadow-sm">
                <Crown size={10} className="text-primary-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display text-sm tracking-tight text-foreground truncate">
                {professional.name}
              </h3>
              {professional.verified && (
                <ShieldCheck size={14} className="text-accent flex-shrink-0" fill="currentColor" />
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {professional.category} · {professional.experience}
            </p>

            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                <Star size={11} className="text-primary" fill="currentColor" />
                <span className="text-xs font-semibold text-foreground">
                  {professional.rating}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({professional.reviewCount})
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin size={10} />
                {professional.city}
              </div>
              {professional.reviewCount > 50 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle size={10} />
                  {professional.reviewCount}+ serviços
                </div>
              )}
            </div>
          </div>

>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
        </div>
      </div>
    </motion.div>
  );
};

<<<<<<< HEAD
// memo: only re-render when the professional data actually changes
export default memo(ProfessionalCard, (prev, next) =>
  prev.professional.id === next.professional.id &&
  prev.professional.rating === next.professional.rating &&
  prev.professional.reviewCount === next.professional.reviewCount &&
  prev.index === next.index
);
=======
export default ProfessionalCard;
>>>>>>> f38df2aedbfdd1c2343837c06db5bb59b8dcdb8a
