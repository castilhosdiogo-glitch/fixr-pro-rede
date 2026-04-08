import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, CheckCircle, Star, Calendar, ArrowLeft, MessageSquare, TrendingUp, ChevronRight, Clock, Zap, Gift, ShieldCheck, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { motion } from "framer-motion";
import { useProfessionalDispatches } from "@/hooks/useDispatches";
import { IncomingRequestCard } from "@/components/matching/IncomingRequestCard";
import { useMyReferralStats } from "@/hooks/useReferral";
import MyReputationPanel from "@/components/reputation/MyReputationPanel";
import { KycUploadForm } from "@/components/kyc/KycUploadForm";
import { useActiveServices } from "@/hooks/useServiceCompletion";
import ActiveServiceCard from "@/components/ActiveServiceCard";
import NotificationBell from "@/components/notifications/NotificationBell";
import { PushToggle } from "@/components/notifications/PushToggle";
import { usePlanGate } from "@/hooks/usePlanGate";

interface Stats {
  requestsReceived: number;
  servicesCompleted: number;
  averageRating: number;
  upcomingServices: number;
}

interface RecentRequest {
  id: string;
  description: string;
  status: string;
  created_at: string;
  client_id: string;
}

const statusLabel: Record<string, { text: string; color: string }> = {
  pending: { text: "Novo", color: "bg-warning/15 text-warning" },
  accepted: { text: "Aceito", color: "bg-success/15 text-success" },
  scheduled: { text: "Agendado", color: "bg-primary/15 text-primary" },
  completed: { text: "Concluído", color: "bg-success/15 text-success" },
  cancelled: { text: "Cancelado", color: "bg-destructive/15 text-destructive" },
};

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["professionalDashboard", user?.id],
    enabled: !!user,
    staleTime: 60_000,   // 1 min — stats don't need to be real-time
    queryFn: async () => {
      const [profileRes, proRes, requests, completed, reviews, upcoming, recentRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, user_type, phone, city, state, avatar_url").eq("user_id", user!.id).single(),
        supabase.from("professional_profiles").select("id, category_name, description, experience, verified").eq("user_id", user!.id).single(),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("professional_id", user!.id),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("professional_id", user!.id).eq("status", "completed"),
        supabase.from("reviews").select("rating").eq("professional_id", user!.id),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("professional_id", user!.id).eq("status", "scheduled"),
        supabase.from("service_requests").select("id, description, status, created_at, client_id").eq("professional_id", user!.id).order("created_at", { ascending: false }).limit(5),
      ]);

      const ratings = reviews.data || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      return {
        profile: profileRes.data,
        proProfile: proRes.data,
        stats: {
          requestsReceived: requests.count || 0,
          servicesCompleted: completed.count || 0,
          averageRating: Math.round(avgRating * 10) / 10,
          upcomingServices: upcoming.count || 0,
        },
        recentRequests: (recentRes.data as RecentRequest[]) || [],
      };
    },
  });

  const profile = data?.profile;
  const proProfile = data?.proProfile;
  const stats = data?.stats || { requestsReceived: 0, servicesCompleted: 0, averageRating: 0, upcomingServices: 0 };
  const recentRequests = data?.recentRequests || [];

  // Incoming dispatches from the matching engine
  const { data: pendingDispatches = [] } = useProfessionalDispatches("pending");

  // Active accepted services — can be marked as completed
  const { data: activeServices = [] } = useActiveServices();

  // Referral stats for the CTA widget
  const { data: referralStats } = useMyReferralStats();

  // Plan gate for limit warnings
  const { plan, limits, requestsNearLimit, requestsAtLimit } = usePlanGate();
  const { data: planData } = useQuery({
    queryKey: ["professional-plan", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select("plan_name, monthly_request_count")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const initials = (profile?.full_name || "P")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const cards = [
    { icon: ClipboardList, label: "Solicitações", value: stats.requestsReceived, color: "text-primary", bg: "bg-primary/10" },
    { icon: CheckCircle, label: "Realizados", value: stats.servicesCompleted, color: "text-success", bg: "bg-success/10" },
    { icon: Star, label: "Avaliação", value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—", color: "text-warning", bg: "bg-warning/10" },
    { icon: Calendar, label: "Agendados", value: stats.upcomingServices, color: "text-accent", bg: "bg-accent/10" },
  ];

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Painel do Profissional | Fixr" />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-6 max-w-lg mx-auto">
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground flex-1">
            SISTEMA DE COMANDO
          </h1>
          <NotificationBell />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Profile summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5 border border-border p-6 bg-secondary/10 rounded-2xl shadow-none"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-display font-black text-2xl">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-black text-xl text-foreground uppercase tracking-tight truncate">
              {profile?.full_name || "OPERADOR TÉCNICO"}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">
              {proProfile?.category_name || "ESPECIALISTA"} · {profile?.city?.toUpperCase() || "LOCAL NÃO DEFINIDO"}
            </p>
          </div>
          {proProfile?.verified && (
            <div className="px-3 py-1 rounded-2xl bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest">
              AUTORIDADE VERIFICADA
            </div>
          )}
        </motion.div>

        {/* Alerta de limite — Explorador */}
        {planData?.plan_name === "explorador" && requestsAtLimit() && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5">
            <p className="font-display font-black text-xs uppercase tracking-widest text-destructive mb-1">
              🚫 LIMITE MENSAL ATINGIDO
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Você usou todos os 8 pedidos do plano Explorador este mês. Faça upgrade para receber mais solicitações.
            </p>
            <Link to="/#planos" className="inline-block px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-black text-[10px] uppercase tracking-widest active:scale-95">
              VER PLANO PARCEIRO →
            </Link>
          </motion.div>
        )}
        {planData?.plan_name === "explorador" && requestsNearLimit() && !requestsAtLimit() && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-yellow-500/50 bg-yellow-500/5 p-5">
            <p className="font-display font-black text-xs uppercase tracking-widest text-yellow-500 mb-1">
              ⚠️ QUASE NO LIMITE — {planData?.monthly_request_count ?? 0}/8 PEDIDOS
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Você está próximo do limite do plano Explorador. Seja Parceiro para pedidos ilimitados.
            </p>
            <Link to="/#planos" className="inline-block px-5 py-2.5 rounded-xl border border-yellow-500/50 text-yellow-500 font-display font-black text-[10px] uppercase tracking-widest hover:bg-yellow-500/10 transition-colors">
              SER PARCEIRO →
            </Link>
          </motion.div>
        )}

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
                className="rounded-2xl bg-card border border-border p-5 flex flex-col items-start gap-4 hover:border-primary transition-colors cursor-default"
              >
                <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center border border-current opacity-80`}>
                  <Icon size={20} className={card.color} />
                </div>
                <div className="space-y-1">
                  <span className="font-display font-black text-3xl text-foreground block tracking-tighter">{card.value}</span>
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] block">
                    {card.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reputation & Trust Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-3 border-l-2 border-primary pl-4">
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Trust Score</span>
            <ShieldCheck size={14} className="text-primary" />
          </div>
          <MyReputationPanel />
        </motion.div>

        {/* Push notifications toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
        >
          <div className="flex items-center gap-2 mb-3 border-l-2 border-primary pl-4">
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Alertas</span>
          </div>
          <PushToggle />
        </motion.div>

        {/* KYC */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <div className="flex items-center gap-2 mb-3 border-l-2 border-primary pl-4">
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Verificação</span>
            <ShieldCheck size={14} className="text-primary" />
          </div>
          <KycUploadForm />
        </motion.div>

        {/* Performance bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card border border-border p-6"
        >
          <div className="flex items-center justify-between mb-6 border-l-2 border-primary pl-4">
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.3em]">Eficiência Operacional</span>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                <span className="text-muted-foreground">Taxa de Resposta</span>
                <span className="text-primary">95%</span>
              </div>
              <div className="h-4 rounded-2xl bg-secondary/20 border border-border p-0.5 overflow-hidden">
                <div className="h-full rounded-2xl bg-primary" style={{ width: "95%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-2">
                <span className="text-muted-foreground">Tempo Médio</span>
                <span className="text-foreground flex items-center gap-1">
                  <Clock size={12} /> 15 MIN
                </span>
              </div>
              <div className="h-4 rounded-2xl bg-secondary/20 border border-border p-0.5 overflow-hidden">
                <div className="h-full rounded-2xl bg-primary" style={{ width: "85%" }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex gap-4"
        >
          <Link
            to="/mensagens"
            className="flex-1 rounded-2xl bg-primary p-6 flex items-center gap-4 hover:bg-primary/90 transition-all text-primary-foreground group"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest">Central de Mensagens</p>
              <p className="text-[10px] opacity-70 font-medium">RESPONDER SOLICITAÇÕES</p>
            </div>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Hub Fiscal + Elite features */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
          className="grid grid-cols-2 gap-3">
          <Link to="/hub-fiscal"
            className="flex items-center gap-3 p-4 rounded-2xl border-2 border-border bg-secondary/10 hover:border-primary transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">HUB FISCAL</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">NFS-E · DAS · MEI</p>
            </div>
          </Link>
          {planData?.plan_name === "elite" ? (
            <Link to="/elite/agenda"
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/5 hover:border-yellow-500/70 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">AGENDA</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">ELITE</p>
              </div>
            </Link>
          ) : (
            <Link to="/#planos"
              className="flex items-center gap-3 p-4 rounded-2xl border-2 border-border bg-secondary/5 opacity-50 hover:opacity-70 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Zap size={18} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">ELITE</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">VER PLANOS</p>
              </div>
            </Link>
          )}
        </motion.div>

        {/* Referral CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.37 }}
        >
          <Link
            to="/indicar"
            className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/5 to-card p-5 hover:border-primary/60 transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Gift size={20} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-foreground">
                Indicar Colegas
              </p>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                {referralStats && referralStats.active_count > 0
                  ? `${referralStats.active_count} ativo${referralStats.active_count > 1 ? "s" : ""} · ${referralStats.months_earned} mês${referralStats.months_earned !== 1 ? "es" : ""} ganho${referralStats.months_earned !== 1 ? "s" : ""}`
                  : "GANHE MESES GRÁTIS E DESTAQUE"}
              </p>
            </div>
            <ChevronRight size={18} className="text-primary group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        </motion.div>

        {/* ── Active services — mark as completed ── */}
        {activeServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
          >
            <div className="flex items-center justify-between mb-4 pl-1">
              <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500" />
                Serviços em Andamento
              </h3>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 tabular-nums">
                {activeServices.length} ativo{activeServices.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {activeServices.map((svc) => (
                <ActiveServiceCard key={svc.id} service={svc} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Incoming dispatches from matching engine ── */}
        {pendingDispatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <div className="flex items-center justify-between mb-4 pl-1">
              <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground flex items-center gap-2">
                <Zap size={12} className="text-primary" />
                Solicitações Recebidas
              </h3>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary tabular-nums">
                {pendingDispatches.length} nova{pendingDispatches.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {pendingDispatches.map((dispatch) => (
                <IncomingRequestCard key={dispatch.id} dispatch={dispatch} />
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
            REGISTRO DE OPERAÇÕES
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
                        DATA REGISTRO: {new Date(req.created_at).toLocaleDateString("pt-BR")}
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
                Nenhuma operação detectada no sistema.
              </p>
            </div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;

