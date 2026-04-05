import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ReviewItem from "@/components/ReviewItem";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import TrustScoreCard from "@/components/reputation/TrustScoreCard";
import { useProfessionalReputation } from "@/hooks/useReputation";

const ProfessionalProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: reputation } = useProfessionalReputation(id);

  const { data: professional, isLoading } = useQuery({
    queryKey: ["professional", id],
    queryFn: async () => {
      // 1. Get professional profile
      const { data: pro, error: proError } = await supabase
        .from("professional_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (proError) throw proError;

      // 2. Get the associated user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", pro.user_id)
        .single();

      // 3. Get reviews with client names
      const { data: reviews } = await supabase
        .from("reviews")
        .select(`
          *,
          client:client_id (
            full_name
          )
        `)
        .eq("professional_id", pro.user_id)
        .order("created_at", { ascending: false });

      return {
        ...pro,
        name: profile?.full_name || "Profissional",
        photo: profile?.avatar_url || "",
        city: profile?.city || "Local não definido",
        state: profile?.state || "RS",
        phone: profile?.phone || "",
        reviews: (reviews || []).map((r: any) => ({
          id: r.id,
          clientName: r.client?.full_name || "Cliente Fixr",
          rating: r.rating,
          comment: r.comment || "",
          date: new Date(r.created_at).toLocaleDateString("pt-BR"),
          serviceDescription: "Serviço Fixr", // Generic for now
        })),
      };
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Terminal...</p>
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
      <SEO title={`${professional.name} - ${professional.category_name} | Fixr`} description={`Conheça ${professional.name}, ${professional.category_name} em ${professional.city}, ${professional.state}. Veja avaliações e solicite um orçamento gratuito.`} image={professional.photo || ""} />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground truncate">
            PERFIL: {professional.name.toUpperCase()}
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Profile header */}
        <div className="bg-card border-b border-border p-6">
          <div className="flex gap-6">
            <div className="flex-shrink-0 flex items-center justify-center w-24 h-24 rounded-2xl bg-primary text-primary-foreground font-display font-black text-3xl uppercase shadow-none border border-primary">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-2xl uppercase tracking-tighter text-foreground">
                  {professional.name}
                </h2>
              </div>

              <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">
                PROFISSÃO: {professional.category_name?.toUpperCase() || "ESPECIALISTA"}
              </p>

              <div className="flex items-center gap-2 mt-3">
                <Star size={16} className="text-primary" fill="currentColor" />
                <span className="text-sm font-black text-foreground tracking-tighter">
                  {professional.rating.toFixed(1)}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
                  [{professional.review_count} AVALIAÇÕES]
                </span>
              </div>
            </div>
          </div>

          {/* Trust Score Card */}
          {reputation && (
            <div className="mt-6">
              <TrustScoreCard reputation={reputation} />
            </div>
          )}

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
        <div className="p-6 mt-4">
          <h2 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6 pl-1 border-l-2 border-primary ml-1">
            AVALIAÇÕES DE CLIENTES
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6">
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

      {/* Fixed CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-40 p-6 bg-background border-t border-border">
        <div className="max-w-lg mx-auto">
          <Link
            to={`/solicitar?pro=${professional.id}`}
            className="w-full flex items-center justify-center gap-4 py-6 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-none"
          >
            <MessageSquare size={18} />
            SOLICITAR AGORA
          </Link>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfessionalProfile;

