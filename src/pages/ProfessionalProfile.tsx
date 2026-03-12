import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ShieldCheck, Crown, MapPin, Clock, MessageSquare, CheckCircle, Shield, Zap } from "lucide-react";
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

  const professionalReviews = professional.reviews || [];

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-base uppercase tracking-tight text-foreground truncate">
            {professional.name}
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Profile header */}
        <div className="bg-card rounded-b-xl p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-display text-2xl uppercase shadow-elevated">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl uppercase tracking-tight text-foreground">
                  {professional.name}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground mt-0.5">
                {professional.category}
              </p>

              <div className="flex items-center gap-1 mt-1.5">
                <Star size={14} className="text-primary" fill="currentColor" />
                <span className="text-sm font-semibold text-foreground">
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                <ShieldCheck size={12} /> Verificado
              </span>
            )}
            {professional.premium && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                <Crown size={12} fill="currentColor" /> Destaque
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium">
              <Shield size={12} /> Chat protegido
            </span>
          </div>

          {/* Service metrics */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl bg-background p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle size={12} className="text-success" />
              </div>
              <p className="font-display text-lg text-foreground">{professional.reviewCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Serviços</p>
            </div>
            <div className="rounded-xl bg-background p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={12} className="text-primary" fill="currentColor" />
              </div>
              <p className="font-display text-lg text-foreground">{professional.rating}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avaliação</p>
            </div>
            <div className="rounded-xl bg-background p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Zap size={12} className="text-primary" />
              </div>
              <p className="font-display text-lg text-foreground">~2h</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resposta</p>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin size={14} />
              {professional.city}, {professional.state}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock size={14} />
              {professional.experience}
            </div>
          </div>

          {/* Description */}
          <p className="mt-4 text-sm text-foreground leading-relaxed">
            {professional.description}
          </p>
        </div>

        {/* Reviews */}
        <div className="p-4 mt-2">
          <h2 className="font-display text-base uppercase tracking-tight text-foreground mb-2">
            Histórico de Trabalhos
          </h2>
          <div className="bg-card rounded-xl overflow-hidden">
            <div className="px-4">
              {professionalReviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          </div>
          {professionalReviews.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum trabalho registrado ainda.
            </p>
          )}
        </div>
      </div>

      {/* Fixed CTA - No phone, only platform actions */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-4 bg-card/95 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto flex gap-2">
          <Link
            to={`/orcamento/${professional.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl gradient-primary text-primary-foreground font-display uppercase tracking-wider text-sm shadow-elevated hover:opacity-90 transition-opacity"
          >
            <MessageSquare size={16} />
            Solicitar Serviço
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfessionalProfile;
