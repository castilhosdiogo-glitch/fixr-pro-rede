import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, MessageSquare, Star, Search, Clock, ChevronRight, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { useCompletedServicesAwaitingReview } from "@/hooks/useServiceCompletion";
import ReviewRequestCard from "@/components/reputation/ReviewRequestCard";
import NotificationBell from "@/components/notifications/NotificationBell";
import PendingReviewsBanner from "@/components/reviews/PendingReviewsBanner";

interface RecentRequest {
  id: string;
  description: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  professional_id: string;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending: { text: "Pendente", color: "bg-warning/15 text-warning" },
  accepted: { text: "Aceito", color: "bg-success/15 text-success" },
  scheduled: { text: "Agendado", color: "bg-primary/15 text-primary" },
  completed: { text: "Concluído", color: "bg-success/15 text-success" },
  cancelled: { text: "Cancelado", color: "bg-destructive/15 text-destructive" },
};

const ClientDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["clientDashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [profileRes, totalRes, pendingRes, completedRes, reviewsRes, recentRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, user_type, phone, city, state, avatar_url").eq("user_id", user!.id).single(),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user!.id),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user!.id).eq("status", "pending"),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user!.id).eq("status", "completed"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("client_id", user!.id),
        supabase.from("service_requests").select("id, description, status, scheduled_date, created_at, professional_id").eq("client_id", user!.id).order("created_at", { ascending: false }).limit(5),
      ]);

      return {
        profile: profileRes.data,
        stats: {
          totalRequests: totalRes.count || 0,
          pendingRequests: pendingRes.count || 0,
          completedRequests: completedRes.count || 0,
          reviewsGiven: reviewsRes.count || 0,
        },
        recentRequests: (recentRes.data as RecentRequest[]) || [],
      };
    },
  });

  const profile = data?.profile;
  const stats = data?.stats || { totalRequests: 0, pendingRequests: 0, completedRequests: 0, reviewsGiven: 0 };
  const recentRequests = data?.recentRequests || [];
  const { data: awaitingReview = [] } = useCompletedServicesAwaitingReview();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Sincronizando Painel...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-center px-4">
        <div>
           <p className="text-xs font-black uppercase tracking-[0.2em] text-destructive mb-2">Acesso Negado</p>
           <p className="text-muted-foreground text-[10px] mb-4">Você precisa estar logado para acessar o painel.</p>
           <Link to="/auth" className="bg-primary text-primary-foreground px-6 py-3 font-black text-[10px] uppercase tracking-widest">
             Fazer Login
           </Link>
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const cards = [
    { icon: ClipboardList, label: "Solicitações", value: stats.totalRequests, color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, label: "Pendentes", value: stats.pendingRequests, color: "text-warning", bg: "bg-warning/10" },
    { icon: Star, label: "Concluídos", value: stats.completedRequests, color: "text-success", bg: "bg-success/10" },
    { icon: MessageSquare, label: "Avaliações", value: stats.reviewsGiven, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Meu Painel | Fixr" />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground flex-1">
            CENTRAL DO CLIENTE
          </h1>
          <NotificationBell />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <PendingReviewsBanner />
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 border border-border p-6 bg-secondary/10 rounded-2xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-display font-black text-2xl">
            {initials}
          </div>
          <div>
            <h2 className="font-display font-black text-xl text-foreground uppercase tracking-tight">
              OLÁ, {profile?.full_name?.split(" ")[0]?.toUpperCase() || "USUÁRIO"}!
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">
              {profile?.city ? `${profile.city.toUpperCase()}, ${profile.state}` : "TERMINAL DE OPERAÇÃO Fixr"}
            </p>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl bg-card border border-border p-5 flex flex-col items-start gap-3 hover:border-primary transition-colors"
              >
                <div className={`w-12 h-12 rounded-2xl ${card.bg} border border-current opacity-80 flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <div className="space-y-0.5">
                  <span className="font-display font-black text-2xl text-foreground block tracking-tighter">{card.value}</span>
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest block">
                    {card.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick action */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            to="/buscar"
            className="flex items-center gap-5 rounded-2xl bg-primary p-6 hover:bg-primary/90 transition-all group shadow-none"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30">
              <Search size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-display font-black text-xs uppercase tracking-[.2em]">REQUISITAR ESPECIALISTA</p>
              <p className="text-white/70 text-[10px] font-medium uppercase mt-1">BUSCAR POR SERVIÇO OU REGIÃO</p>
            </div>
            <ChevronRight size={24} className="text-white group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* ── Upcoming scheduled services ── */}
        {recentRequests.filter((r) => r.status === "scheduled" && r.scheduled_date).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <div className="flex items-center justify-between mb-4 pl-1">
              <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground flex items-center gap-2">
                <Calendar size={12} className="text-primary" />
                Próximos Agendamentos
              </h3>
            </div>
            <div className="space-y-3">
              {recentRequests
                .filter((r) => r.status === "scheduled" && r.scheduled_date)
                .map((req) => (
                  <div
                    key={req.id}
                    className="rounded-2xl bg-card border border-primary/30 p-4 space-y-2"
                  >
                    <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-primary flex-shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                        {new Date(req.scheduled_date!).toLocaleString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </motion.div>
        )}

        {/* ── Pending reviews ── */}
        {awaitingReview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-4 pl-1">
              <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground flex items-center gap-2">
                <Star size={12} className="text-yellow-500" />
                Avaliar Serviços
              </h3>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-600 tabular-nums">
                {awaitingReview.length} pendente{awaitingReview.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {awaitingReview.map((svc: any) => (
                <ReviewRequestCard
                  key={svc.id}
                  serviceRequestId={svc.id}
                  professionalId={svc.professional_id}
                  professionalName={svc.professional_name}
                  serviceDescription={svc.description}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent requests */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4 pl-1">
            LOG DE SOLICITAÇÕES
          </h3>
          {recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((req) => {
                const st = statusLabel[req.status] || statusLabel.pending;
                return (
                  <div
                    key={req.id}
                    className="rounded-2xl bg-card border border-border p-5 flex items-center gap-4 border-l-4 border-l-primary hover:bg-secondary/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground uppercase tracking-tight truncate">{req.description}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                        REGISTRO: {new Date(req.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-2xl border border-current ${st.color}`}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-dashed border-border p-12 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                NENHUMA SOLICITAÇÃO ENCONTRADA.
              </p>
              <Link to="/buscar" className="text-primary text-[10px] font-black uppercase tracking-widest mt-4 inline-block hover:underline">
                INICIAR BUSCA DE ESPECIALISTAS
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ClientDashboard;

