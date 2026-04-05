import { Calendar, Star, TrendingUp, Gift, CheckCircle, Clock } from "lucide-react";
import { useMyRewards, useApplyPendingRewards, ReferralReward } from "@/hooks/useReferral";
import { toast } from "sonner";

// ─── Reward config ────────────────────────────────────────────

const REWARD_CONFIG: Record<
  ReferralReward["reward_type"],
  { label: string; icon: typeof Gift; color: string; bg: string }
> = {
  subscription_month: {
    label: "Mês Grátis",
    icon: Calendar,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  visibility_boost: {
    label: "Destaque na Busca",
    icon: Star,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  ranking_boost: {
    label: "Boost no Ranking",
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
};

// ─── Tier labels ──────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  1: "Perfil completo",
  2: "Primeiro serviço",
  3: "Marco atingido",
};

// ─── Single reward card ───────────────────────────────────────

const RewardCard = ({ reward }: { reward: ReferralReward }) => {
  const cfg = REWARD_CONFIG[reward.reward_type];
  const Icon = cfg.icon;
  const isActive = reward.status === "applied" && reward.expires_at && new Date(reward.expires_at) > new Date();
  const isPending = reward.status === "pending";

  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
        isPending
          ? "border-primary/30 bg-primary/5"
          : isActive
          ? `border-current/20 ${cfg.bg}`
          : "border-border bg-secondary/5 opacity-60"
      }`}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-2xl ${cfg.bg} border border-current/20 flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={cfg.color} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
          {cfg.label}
        </p>
        <p className="text-[9px] font-bold text-muted-foreground mt-0.5">
          {reward.reward_type === "subscription_month"
            ? `+${reward.months} mês${(reward.months ?? 0) > 1 ? "es" : ""} grátis`
            : `+${reward.boost_days} dias de ${cfg.label.toLowerCase()}`}
          {" · "}{TIER_LABELS[reward.tier]}
        </p>
        {reward.expires_at && isActive && (
          <p className="text-[8px] font-bold text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock size={9} />
            Expira em {new Date(reward.expires_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        {isPending ? (
          <span className="text-[8px] font-black uppercase tracking-widest text-primary px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
            Pendente
          </span>
        ) : isActive ? (
          <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.color} px-2 py-1 rounded-lg ${cfg.bg} border border-current/20`}>
            Ativo
          </span>
        ) : (
          <CheckCircle size={14} className="text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────

export const RewardsTimeline = () => {
  const { data: rewards = [], isLoading } = useMyRewards();
  const { mutateAsync: applyRewards, isPending: applying } = useApplyPendingRewards();

  const pendingCount = rewards.filter((r) => r.status === "pending").length;
  const totalMonths = rewards
    .filter((r) => r.reward_type === "subscription_month")
    .reduce((sum, r) => sum + (r.months ?? 0), 0);

  const handleApply = async () => {
    try {
      await applyRewards();
      toast.success("Recompensas aplicadas ao seu perfil!");
    } catch {
      toast.error("Erro ao aplicar recompensas.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-secondary/20" />)}
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/5 p-8 text-center space-y-2">
        <Gift size={28} className="mx-auto text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nenhuma recompensa ainda
        </p>
        <p className="text-[9px] font-medium text-muted-foreground">
          Cada indicação ativa gera recompensas automáticas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      {totalMonths > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Total acumulado
          </p>
          <p className="font-display font-black text-xl text-primary tabular-nums">
            {totalMonths} {totalMonths === 1 ? "mês" : "meses"} grátis
          </p>
        </div>
      )}

      {/* Apply button when there are pending rewards */}
      {pendingCount > 0 && (
        <button
          onClick={handleApply}
          disabled={applying}
          className="w-full py-3 bg-primary text-primary-foreground font-display font-black text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Gift size={14} />
          {applying ? "Aplicando..." : `Resgatar ${pendingCount} recompensa${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`}
        </button>
      )}

      {/* Reward cards */}
      <div className="space-y-2">
        {rewards.map((reward) => (
          <RewardCard key={reward.id} reward={reward} />
        ))}
      </div>
    </div>
  );
};
