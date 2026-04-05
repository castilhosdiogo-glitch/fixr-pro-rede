import { useMemo } from "react";
import { Clock, CheckCircle, Zap, AlertTriangle, User } from "lucide-react";
import { useMyReferrals, ReferralStatus } from "@/hooks/useReferral";

// ─── Status config ────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ReferralStatus,
  { label: string; icon: typeof Clock; color: string; bg: string; border: string; step: number }
> = {
  pending: {
    label: "Cadastrou",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-secondary/10",
    border: "border-border",
    step: 1,
  },
  profile_complete: {
    label: "Perfil completo",
    icon: CheckCircle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    step: 2,
  },
  active: {
    label: "Ativo",
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    step: 3,
  },
  rewarded: {
    label: "Recompensado",
    icon: Zap,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    step: 4,
  },
  fraud: {
    label: "Fraude detectada",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/30",
    step: 0,
  },
};

// ─── Funnel header ────────────────────────────────────────────

const FunnelBar = ({ counts }: { counts: Record<string, number> }) => {
  const stages = [
    { key: "pending", label: "Cadastrou" },
    { key: "profile_complete", label: "Perfil" },
    { key: "active", label: "Ativo" },
    { key: "rewarded", label: "Premiado" },
  ];
  const max = Math.max(...stages.map((s) => counts[s.key] ?? 0), 1);

  return (
    <div className="grid grid-cols-4 gap-2">
      {stages.map(({ key, label }) => {
        const count = counts[key] ?? 0;
        const pct = (count / max) * 100;
        const cfg = STATUS_CONFIG[key as ReferralStatus];
        return (
          <div key={key} className="text-center space-y-1.5">
            <div className="h-12 rounded-xl bg-secondary/10 border border-border overflow-hidden flex items-end">
              <div
                className={`w-full rounded-t-lg transition-all duration-700 ${cfg.bg.replace("/10", "/30")}`}
                style={{ height: `${Math.max(pct, 5)}%` }}
              />
            </div>
            <p className={`font-display font-black text-lg tabular-nums ${cfg.color}`}>
              {count}
            </p>
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────

export const ReferralsList = () => {
  const { data: referrals = [], isLoading } = useMyReferrals();

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    referrals.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [referrals]);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-secondary/20" />
        ))}
      </div>
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/5 p-10 text-center">
        <User size={28} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nenhuma indicação ainda.
        </p>
        <p className="text-[9px] font-medium text-muted-foreground mt-1">
          Compartilhe seu link para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Funnel chart */}
      <FunnelBar counts={counts} />

      {/* List */}
      <div className="space-y-2">
        {referrals.map((ref) => {
          const cfg = STATUS_CONFIG[ref.status];
          const Icon = cfg.icon;
          const initials = (ref.referred_profile?.full_name ?? "?")
            .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

          return (
            <div
              key={ref.id}
              className={`flex items-center gap-4 rounded-2xl border ${cfg.border} ${cfg.bg} p-4`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-secondary/30 border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground flex-shrink-0">
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">
                  {ref.referred_profile?.full_name ?? "Profissional"}
                </p>
                <p className="text-[8px] font-bold text-muted-foreground mt-0.5">
                  {ref.referred_profile?.city ?? "—"} ·{" "}
                  Indicado em {new Date(ref.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {/* Status badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                <Icon size={10} className={cfg.color} />
                <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.color}`}>
                  {cfg.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
