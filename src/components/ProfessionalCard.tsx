import { Link } from "react-router-dom";
import { Star, ShieldCheck, Crown, MapPin } from "lucide-react";
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
      className="block rounded-lg bg-card shadow-card hover:shadow-card-hover transition-all duration-200"
    >
      <div className="flex gap-4 p-4">
        {/* Avatar */}
        <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-secondary text-foreground font-display text-lg uppercase">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-display text-sm uppercase tracking-tight text-foreground truncate">
              {professional.name}
            </h3>
            {professional.verified && (
              <ShieldCheck size={14} className="text-accent flex-shrink-0" fill="currentColor" />
            )}
            {professional.premium && (
              <Crown size={14} className="text-primary flex-shrink-0" fill="currentColor" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">
            {professional.category}
          </p>

          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center gap-1">
              <Star size={12} className="text-primary" fill="currentColor" />
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
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProfessionalCard;
