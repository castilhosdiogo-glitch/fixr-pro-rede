import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, CheckCircle, Star, Calendar, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";

interface Stats {
  requestsReceived: number;
  servicesCompleted: number;
  averageRating: number;
  upcomingServices: number;
}

const DashboardPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    requestsReceived: 0,
    servicesCompleted: 0,
    averageRating: 0,
    upcomingServices: 0,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      const [requests, completed, reviews, upcoming] = await Promise.all([
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("professional_id", user.id),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("professional_id", user.id)
          .eq("status", "completed"),
        supabase
          .from("reviews")
          .select("rating")
          .eq("professional_id", user.id),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .eq("professional_id", user.id)
          .eq("status", "scheduled"),
      ]);

      const ratings = reviews.data || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0;

      setStats({
        requestsReceived: requests.count || 0,
        servicesCompleted: completed.count || 0,
        averageRating: Math.round(avgRating * 10) / 10,
        upcomingServices: upcoming.count || 0,
      });
    };

    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const cards = [
    {
      icon: ClipboardList,
      label: "Solicitações Recebidas",
      value: stats.requestsReceived,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: CheckCircle,
      label: "Serviços Realizados",
      value: stats.servicesCompleted,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: Star,
      label: "Avaliação Média",
      value: stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Calendar,
      label: "Agenda",
      value: stats.upcomingServices,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-card border-b-2 border-border p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-foreground">
            <ArrowLeft size={24} />
          </button>
          <h1 className="font-display text-lg uppercase tracking-tight text-foreground">
            Painel do Profixssional
          </h1>
        </div>
      </header>

      <div className="p-4 grid grid-cols-2 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border-2 border-border p-4 flex flex-col items-center text-center gap-2"
            >
              <div className={`w-12 h-12 flex items-center justify-center ${card.bg}`}>
                <Icon size={24} className={card.color} />
              </div>
              <span className="font-display text-2xl text-foreground">{card.value}</span>
              <span className="text-xs text-muted-foreground font-display uppercase tracking-wider">
                {card.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 mt-4">
        <h2 className="font-display text-base uppercase tracking-tight text-foreground mb-3">
          Solicitações Recentes
        </h2>
        <div className="bg-card border-2 border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Suas solicitações de serviço aparecerão aqui.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default DashboardPage;
