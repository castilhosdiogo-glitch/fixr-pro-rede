import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ShieldCheck, Crown, MapPin, Clock, Phone } from "lucide-react";
import { professionals } from "@/data/mock";
import ReviewItem from "@/components/ReviewItem";
import BottomNav from "@/components/BottomNav";

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const professional = professionals.find((p) => p.id === id);

  if (!professional) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profissional não encontrado.</p>
      </div>
    );
  }

  const initials = professional.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-display text-lg uppercase tracking-tight text-foreground truncate">
            {professional.name}
          </h1>
        </div>
      </header>

      {/* Profile header - continuous feed starts here */}
      <div className="bg-card border-b-2 border-border p-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 bg-secondary text-foreground font-display text-2xl uppercase">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl uppercase tracking-tight text-foreground">
                {professional.name}
              </h2>
              {professional.verified && (
                <ShieldCheck size={18} className="text-accent" fill="currentColor" />
              )}
              {professional.premium && (
                <Crown size={18} className="text-primary" fill="currentColor" />
              )}
            </div>

            <p className="text-sm font-display uppercase text-muted-foreground mt-0.5">
              {professional.category}
            </p>

            <div className="flex items-center gap-1 mt-1">
              <Star size={16} className="text-primary" fill="currentColor" />
              <span className="text-sm font-medium text-foreground">
                {professional.rating}
              </span>
              <span className="text-sm text-muted-foreground">
                ({professional.reviewCount} avaliações)
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {professional.verified && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-accent text-accent-foreground text-xs font-display uppercase">
              <ShieldCheck size={12} fill="currentColor" /> Verificado
            </span>
          )}
          {professional.premium && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-display uppercase">
              <Crown size={12} fill="currentColor" /> Destaque
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} fill="currentColor" />
            {professional.city}, {professional.state}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock size={14} fill="currentColor" />
            {professional.experience} de experiência
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone size={14} fill="currentColor" />
            {professional.phone}
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm text-foreground leading-relaxed">
          {professional.description}
        </p>
      </div>

      {/* Reviews - continuous feed */}
      <div className="p-4">
        <h2 className="font-display text-base uppercase tracking-tight text-foreground mb-2">
          Histórico de Trabalhos
        </h2>
        {professional.reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
        {professional.reviews.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum trabalho registrado ainda.
          </p>
        )}
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-card border-t-2 border-border">
        <Link
          to={`/orcamento/${professional.id}`}
          className="block w-full py-4 bg-primary text-primary-foreground font-display text-center uppercase tracking-wider text-base hover:opacity-90 transition-opacity"
        >
          Solicitar Orçamento
        </Link>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfessionalProfile;
