import { CheckCircle2, Clock, Percent, Wifi, WifiOff, Activity } from "lucide-react";
import type { ActivityStatus } from "@/hooks/useReputation";

interface TrustSignalsProps {
  completedCount: number;
  responseTimeDisplay: string | null;
  responseRatePct: number | null;
  activityStatus: ActivityStatus;
  layout?: "row" | "grid";
}

const ACTIVITY_CONFIG: Record<
  ActivityStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  online:       { label: "Online agora",    icon: <Wifi size={11} />,      className: "text-emerald-500" },
  hoje:         { label: "Ativo hoje",      icon: <Activity size={11} />,  className: "text-primary" },
  esta_semana:  { label: "Esta semana",     icon: <Activity size={11} />,  className: "text-yellow-500" },
  inativo:      { label: "Pouco ativo",     icon: <WifiOff size={11} />,   className: "text-muted-foreground" },
};

export default function TrustSignals({
  completedCount,
  responseTimeDisplay,
  responseRatePct,
  activityStatus,
  layout = "row",
}: TrustSignalsProps) {
  const activity = ACTIVITY_CONFIG[activityStatus];

  const signals = [
    {
      icon: <CheckCircle2 size={12} className="text-emerald-500" />,
      value: completedCount > 0 ? String(completedCount) : "—",
      label: "Serviços",
      show: true,
    },
    {
      icon: <Clock size={12} className="text-primary" />,
      value: responseTimeDisplay ?? "—",
      label: "Resposta",
      show: true,
    },
    {
      icon: <Percent size={12} className="text-blue-500" />,
      value: responseRatePct != null ? `${responseRatePct}%` : "—",
      label: "Aceitação",
      show: true,
    },
  ];

  if (layout === "grid") {
    return (
      <div className="grid grid-cols-4 divide-x divide-border border border-border">
        {signals.map((s) => (
          <div key={s.label} className="flex flex-col items-center justify-center py-4 gap-1">
            {s.icon}
            <span className="font-display font-black text-base tracking-tighter text-foreground">
              {s.value}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              {s.label}
            </span>
          </div>
        ))}
        {/* Activity column */}
        <div className={`flex flex-col items-center justify-center py-4 gap-1 ${activity.className}`}>
          {activity.icon}
          <span className="font-display font-black text-[10px] tracking-tighter text-center leading-tight px-1">
            {activity.label.toUpperCase()}
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
            Status
          </span>
        </div>
      </div>
    );
  }

  // Row layout (compact, for cards)
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {signals.map((s) => (
        <div key={s.label} className="flex items-center gap-1">
          {s.icon}
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            {s.value} {s.label}
          </span>
        </div>
      ))}
      <div className={`flex items-center gap-1 ${activity.className}`}>
        {activity.icon}
        <span className="text-[9px] font-black uppercase tracking-wider">
          {activity.label}
        </span>
      </div>
    </div>
  );
}
