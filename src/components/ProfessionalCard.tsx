import { Link } from "react-router-dom";
import { Star, ShieldCheck, Crown } from "lucide-react";
import type { Professional } from "@/data/mock";

interface ProfessionalCardProps {
  professional: Professional;
}

const ProfessionalCard = ({ professional }: ProfessionalCardProps) => {
  const initials = professional.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <Link
      to={`/profissional/${professional.id}`}
      className="block bg-card border-2 border-border hover:border-primary transition-colors"
    >
      <div className="flex gap-4 p-4">
        {/* Avatar */}
        <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 bg-secondary text-foreground font-display text-xl uppercase">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-base uppercase tracking-tight text-foreground truncate">
              {professional.name}
            </h3>
            {professional.verified && (
              <ShieldCheck size={16} className="text-accent flex-shrink-0" fill="currentColor" />
            )}
            {professional.premium && (
              <Crown size={16} className="text-primary flex-shrink-0" fill="currentColor" />
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-0.5">
            {professional.category}
          </p>

          <p className="text-sm text-muted-foreground">
            {professional.city}, {professional.state}
          </p>

          <div className="flex items-center gap-1 mt-1">
            <Star size={14} className="text-primary" fill="currentColor" />
            <span className="text-sm font-medium text-foreground">
              {professional.rating}
            </span>
            <span className="text-sm text-muted-foreground">
              ({professional.reviewCount} avaliações)
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProfessionalCard;
