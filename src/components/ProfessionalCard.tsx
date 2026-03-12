import { Link } from "react-router-dom";
import { Star, ShieldCheck, Crown, MapPin, ArrowRight, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { Professional } from "@/data/mock";

interface ProfessionalCardProps {
  professional: Professional;
  index?: number;
}

const ProfessionalCard = ({ professional, index = 0 }: ProfessionalCardProps) => {
  const initials = professional.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const avatarColors = [
    "from-primary to-primary-glow",
    "from-accent to-primary",
    "from-success to-accent",
    "from-primary-glow to-primary",
  ];

  const colorClass = avatarColors[index % avatarColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link
        to={`/profissional/${professional.id}`}
        className="group block rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
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

          {/* Arrow */}
          <div className="flex items-center">
            <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProfessionalCard;
