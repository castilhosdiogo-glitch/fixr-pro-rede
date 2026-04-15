import { useState, useEffect, useCallback } from "react";
import { Clock, MapPin, Tag, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Dispatch, useRespondToDispatch } from "@/hooks/useDispatches";
import { useCategories } from "@/hooks/useCategories";
import { useIsProBlockedByPending } from "@/hooks/usePendingReviews";
import { toast } from "sonner";

interface IncomingRequestCardProps {
  dispatch: Dispatch;
}

// Formats mm:ss countdown from seconds remaining
const formatCountdown = (secs: number): string => {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Card shown in the professional's dashboard for each incoming dispatch.
 * Includes:
 * - Live countdown timer to response deadline
 * - Service description + city + category
 * - Round indicator (expansions)
 * - Accept / Decline buttons
 * - Visual urgency as timer approaches zero
 */
export const IncomingRequestCard = ({ dispatch: d }: IncomingRequestCardProps) => {
  const { data: categories = [] } = useCategories();
  const { mutateAsync: respond, isPending } = useRespondToDispatch();
  const { data: blockedByPending = false } = useIsProBlockedByPending();
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  // ── Countdown ────────────────────────────────────────────────
  const expiresAt = new Date(d.expires_at).getTime();
  const calcSecsLeft = useCallback(
    () => Math.max(0, Math.round((expiresAt - Date.now()) / 1000)),
    [expiresAt]
  );
  const [secsLeft, setSecsLeft] = useState(calcSecsLeft);

  useEffect(() => {
    if (d.status !== "pending") return;
    const interval = setInterval(() => setSecsLeft(calcSecsLeft()), 1000);
    return () => clearInterval(interval);
  }, [d.status, calcSecsLeft]);

  const isExpired = secsLeft === 0 || d.status !== "pending";
  const isUrgent = secsLeft > 0 && secsLeft <= 60;
  const pct = Math.min(100, (secsLeft / (5 * 60)) * 100); // assume 5min window

  const categoryName =
    categories.find((c) => c.id === d.broadcast?.category_id)?.name ??
    d.broadcast?.category_id ??
    "Serviço";

  // ── Respond ──────────────────────────────────────────────────
  const handleRespond = async (response: "accepted" | "declined") => {
    if (response === "accepted" && blockedByPending) {
      toast.error("Você precisa avaliar os clientes pendentes antes de aceitar novos pedidos.");
      return;
    }
    try {
      await respond({ dispatchId: d.id, response });
      setResponded(response);
      toast.success(response === "accepted" ? "Solicitação aceita!" : "Solicitação recusada.");
    } catch {
      toast.error("Erro ao responder. Tente novamente.");
    }
  };

  // ── Post-response state ───────────────────────────────────────
  if (responded === "accepted" || d.status === "accepted") {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 flex items-center gap-4 animate-in fade-in duration-300">
        <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Aceito!</p>
          <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
            Aguarde o cliente entrar em contato via mensagens.
          </p>
        </div>
      </div>
    );
  }
  if (responded === "declined" || d.status === "declined") {
    return null; // Remove declined cards from the list
  }
  if (isExpired && d.status !== "pending") {
    return (
      <div className="rounded-2xl border border-border bg-secondary/5 p-4 flex items-center gap-3 opacity-50">
        <Clock size={16} className="text-muted-foreground" />
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Solicitação expirada · {categoryName} em {d.broadcast?.city}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-card p-5 space-y-4 transition-all duration-300 ${
        isUrgent
          ? "border-red-500/50 shadow-[0_0_15px_-3px_hsl(var(--destructive)/0.2)]"
          : "border-primary/30"
      }`}
    >
      {/* Top row: round badge + countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {d.round > 1 && (
            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">
              Expansão R{d.round}
            </span>
          )}
          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
            Nova Solicitação
          </span>
        </div>

        {/* Countdown */}
        <div className={`flex items-center gap-1.5 ${isUrgent ? "text-red-400" : "text-muted-foreground"}`}>
          <Clock size={12} className={isUrgent ? "animate-pulse" : ""} />
          <span className={`text-xs font-black tabular-nums ${isUrgent ? "text-red-400" : "text-foreground"}`}>
            {formatCountdown(secsLeft)}
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent ? "bg-red-500 animate-pulse" : pct > 50 ? "bg-primary" : "bg-yellow-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Request details */}
      <div className="space-y-2">
        <p className="text-sm font-black text-foreground uppercase tracking-tight leading-snug">
          {d.broadcast?.description ?? "Descrição indisponível"}
        </p>
        <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1">
            <Tag size={10} className="text-primary" />
            {categoryName}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={10} className="text-primary" />
            {d.broadcast?.city ?? "—"}
          </span>
        </div>
      </div>

      {/* Match score (secondary info) */}
      <div className="flex items-center gap-2 py-2 border-t border-border/50">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/60"
            style={{ width: `${Math.min(d.score * 100, 100)}%` }}
          />
        </div>
        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground tabular-nums">
          Match {(d.score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Action buttons */}
      {isExpired ? (
        <div className="flex items-center gap-2 py-2">
          <AlertTriangle size={14} className="text-muted-foreground" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Tempo esgotado
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleRespond("declined")}
            disabled={isPending}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive transition-all active:scale-95 disabled:opacity-40"
          >
            <XCircle size={14} />
            Recusar
          </button>
          <button
            onClick={() => handleRespond("accepted")}
            disabled={isPending || blockedByPending}
            title={blockedByPending ? "Avalie as pendências antes de aceitar novos pedidos" : undefined}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40"
          >
            <CheckCircle size={14} />
            {blockedByPending ? "Bloqueado" : "Aceitar"}
          </button>
        </div>
      )}
    </div>
  );
};
