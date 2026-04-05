import { Clock, CheckCircle, XCircle, Users, Loader2 } from "lucide-react";
import { useBroadcastStatus } from "@/hooks/useMatchingEngine";
import { useBroadcastDispatches } from "@/hooks/useDispatches";

interface DispatchStatusBadgeProps {
  broadcastId: string;
  /** Show full progress breakdown (dispatches per round) */
  showBreakdown?: boolean;
}

const STATUS_CONFIG = {
  dispatching: {
    label: "Buscando profissionais...",
    icon: Loader2,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    spin: true,
  },
  expanding: {
    label: "Expandindo busca...",
    icon: Users,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    spin: false,
  },
  accepted: {
    label: "Profissional encontrado!",
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    spin: false,
  },
  expired: {
    label: "Nenhum profissional disponível",
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-secondary/10",
    border: "border-border",
    spin: false,
  },
  cancelled: {
    label: "Solicitação cancelada",
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-secondary/10",
    border: "border-border",
    spin: false,
  },
};

/**
 * Live status pill shown to clients after submitting a broadcast request.
 * Polls automatically while dispatching/expanding (see useBroadcastStatus).
 */
export const DispatchStatusBadge = ({ broadcastId, showBreakdown = false }: DispatchStatusBadgeProps) => {
  const { data: broadcast } = useBroadcastStatus(broadcastId);
  const { data: dispatches = [] } = useBroadcastDispatches(showBreakdown ? broadcastId : null);

  if (!broadcast) return null;

  const cfg = STATUS_CONFIG[broadcast.status] ?? STATUS_CONFIG.dispatching;
  const Icon = cfg.icon;

  const pending   = dispatches.filter((d) => d.status === "pending").length;
  const accepted  = dispatches.filter((d) => d.status === "accepted").length;
  const declined  = dispatches.filter((d) => d.status === "declined").length;
  const expired   = dispatches.filter((d) => d.status === "expired").length;

  return (
    <div className="space-y-3">
      {/* Status pill */}
      <div
        className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border ${cfg.bg} ${cfg.border}`}
      >
        <Icon
          size={14}
          className={`${cfg.color} ${cfg.spin ? "animate-spin" : ""} flex-shrink-0`}
        />
        <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
          {cfg.label}
        </span>
        {(broadcast.status === "dispatching" || broadcast.status === "expanding") && (
          <span className="text-[9px] font-bold text-muted-foreground">
            · Rodada {broadcast.current_round}
          </span>
        )}
      </div>

      {/* Breakdown grid */}
      {showBreakdown && dispatches.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Aguardando", value: pending, color: "text-primary" },
            { label: "Aceitos", value: accepted, color: "text-green-400" },
            { label: "Recusados", value: declined, color: "text-muted-foreground" },
            { label: "Expirados", value: expired, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl bg-secondary/10 border border-border py-2 px-1">
              <p className={`font-display font-black text-lg tabular-nums ${color}`}>{value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Accepted professional info */}
      {broadcast.status === "accepted" && broadcast.accepted_professional_id && (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/5 px-4 py-3 flex items-center gap-3">
          <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
          <p className="text-[9px] font-medium text-muted-foreground">
            Profissional confirmado. Acesse{" "}
            <a href="/mensagens" className="text-primary font-bold hover:underline">
              Mensagens
            </a>{" "}
            para coordenar os detalhes.
          </p>
        </div>
      )}

      {/* Expired CTA */}
      {broadcast.status === "expired" && (
        <div className="rounded-2xl border border-border bg-secondary/5 px-4 py-3">
          <p className="text-[9px] font-medium text-muted-foreground">
            Nenhum profissional aceitou nesta rodada.{" "}
            <a href="/solicitar" className="text-primary font-bold hover:underline">
              Tente novamente
            </a>{" "}
            ou{" "}
            <a href="/buscar" className="text-primary font-bold hover:underline">
              busque manualmente
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
};
