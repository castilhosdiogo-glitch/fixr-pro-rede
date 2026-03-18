import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, MessageSquare, Star, Search, Clock, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

interface ClientStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  reviewsGiven: number;
}

interface RecentRequest {
  id: string;
  description: string;
  status: string;
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
  const [stats, setStats] = useState<ClientStats>({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    reviewsGiven: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [profileRes, totalRes, pendingRes, completedRes, reviewsRes, recentRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user.id),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user.id).eq("status", "pending"),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", user.id).eq("status", "completed"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("client_id", user.id),
        supabase.from("service_requests").select("id, description, status, created_at, professional_id").eq("client_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      setProfile(profileRes.data);
      setStats({
        totalRequests: totalRes.count || 0,
        pendingRequests: pendingRes.count || 0,
        completedRequests: completedRes.count || 0,
        reviewsGiven: reviewsRes.count || 0,
      });
      setRecentRequests((recentRes.data as RecentRequest[]) || []);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-foreground hover:text-primary transition-colors">
            <ArrowLeft size={22} />
          </button>
          <h1 className="font-display text-base tracking-tight text-foreground">
            Meu Painel
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-display text-lg">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-lg text-foreground">
              Olá, {profile?.full_name?.split(" ")[0] || "Usuário"}!
            </h2>
            <p className="text-xs text-muted-foreground">
              {profile?.city ? `${profile.city}, ${profile.state}` : "Bem-vindo ao PROFIX"}
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
                className="rounded-2xl bg-card shadow-card p-4 flex flex-col items-start gap-2"
              >
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={18} className={card.color} />
                </div>
                <span className="font-display text-2xl text-foreground">{card.value}</span>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  {card.label}
                </span>
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
            className="flex items-center gap-3 rounded-2xl gradient-primary p-4 shadow-elevated hover:scale-[1.01] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Search size={18} className="text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-primary-foreground font-display text-sm">Encontrar Profissional</p>
              <p className="text-primary-foreground/60 text-xs">Buscar por serviço ou região</p>
            </div>
            <ChevronRight size={18} className="text-primary-foreground/60" />
          </Link>
        </motion.div>

        {/* Recent requests */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Solicitações Recentes
          </h3>
          {recentRequests.length > 0 ? (
            <div className="space-y-2">
              {recentRequests.map((req) => {
                const st = statusLabel[req.status] || statusLabel.pending;
                return (
                  <div
                    key={req.id}
                    className="rounded-2xl bg-card shadow-card p-4 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{req.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(req.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                      {st.text}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-card shadow-card p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não fez nenhuma solicitação.
              </p>
              <Link to="/buscar" className="text-primary text-sm font-medium mt-2 inline-block">
                Buscar profissionais
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
