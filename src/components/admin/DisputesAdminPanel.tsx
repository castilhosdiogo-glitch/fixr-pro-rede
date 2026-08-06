import { useState } from "react";
import { ShieldAlert, ShieldCheck, ShieldX, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminDisputeQueue,
  useAdminResolveDispute,
  DISPUTE_REASON_LABELS,
  type ServiceDispute,
} from "@/hooks/useDisputes";

interface CheckinSnapshot {
  checkpoint_pct: number;
  response: "ok" | "problem" | null;
  comment: string | null;
  responded_at: string | null;
}

function EvidenceTimeline({ dispute }: { dispute: ServiceDispute }) {
  const checkins = (Array.isArray(dispute.evidence_snapshot) ? dispute.evidence_snapshot : []) as CheckinSnapshot[];

  if (!checkins.length) {
    return (
      <p className="text-[9px] text-muted-foreground italic">
        Nenhum check-in registrado durante esse serviço (profissional pode não ter iniciado com duração estimada).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {checkins.map((c, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl bg-secondary/10 border border-border px-3 py-2">
          <span className="text-[9px] font-black text-muted-foreground tabular-nums flex-shrink-0">
            {c.checkpoint_pct}%
          </span>
          <div className="flex-1 min-w-0">
            {c.responded_at ? (
              <>
                <p className={`text-[10px] font-black uppercase tracking-widest ${c.response === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                  {c.response === "ok" ? "Cliente confirmou: tá bom" : "Cliente reportou problema"}
                </p>
                {c.comment && <p className="text-[10px] text-muted-foreground mt-0.5">"{c.comment}"</p>}
                <p className="text-[8px] text-muted-foreground/60 mt-0.5">
                  {new Date(c.responded_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Sem resposta</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DisputeCard({ dispute }: { dispute: ServiceDispute }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [partialAmount, setPartialAmount] = useState("");
  const [showPartialInput, setShowPartialInput] = useState(false);
  const { mutateAsync: resolve, isPending } = useAdminResolveDispute();

  const runResolve = async (resolution: "refund_full" | "refund_partial" | "deny") => {
    if (!notes.trim()) {
      toast.error("Adicione uma nota explicando a decisão.");
      return;
    }
    let refundAmountCents: number | undefined;
    if (resolution === "refund_partial") {
      const value = Math.round(parseFloat(partialAmount.replace(",", ".")) * 100);
      if (!value || value < 1) {
        toast.error("Informe um valor de reembolso parcial válido.");
        return;
      }
      refundAmountCents = value;
    }
    try {
      await resolve({ disputeId: dispute.id, resolution, refundAmountCents, resolutionNotes: notes.trim() });
      toast.success("Disputa resolvida.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao resolver disputa.");
    }
  };

  const createdAt = new Date(dispute.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldAlert size={14} className="text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">
            {dispute.service_description}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
            {DISPUTE_REASON_LABELS[dispute.reason]} · {createdAt}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex-shrink-0">
          <Clock size={10} className="text-yellow-500" />
          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Aberta</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Relato do cliente</p>
            <p className="text-xs text-foreground leading-relaxed">{dispute.description}</p>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Histórico de check-ins (evidência)
            </p>
            <EvidenceTimeline dispute={dispute} />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              Nota da decisão (visível internamente)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Justifique a decisão..."
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {showPartialInput && (
            <input
              type="text"
              inputMode="decimal"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="Valor do reembolso parcial (R$)"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => runResolve("refund_full")}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <ShieldCheck size={12} /> Reembolso total
            </button>
            <button
              onClick={() => (showPartialInput ? runResolve("refund_partial") : setShowPartialInput(true))}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <ShieldAlert size={12} /> {showPartialInput ? "Confirmar parcial" : "Reembolso parcial"}
            </button>
            <button
              onClick={() => runResolve("deny")}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-black text-[9px] uppercase tracking-widest hover:bg-destructive/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <ShieldX size={12} /> Negar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DisputesAdminPanel() {
  const { data: queue = [], isLoading } = useAdminDisputeQueue();

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-16" />
      ))}
    </div>
  );

  if (queue.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Nenhuma disputa pendente
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">
          Disputas
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/30">
          <ShieldAlert size={10} className="text-red-500" />
          <span className="text-[9px] font-black text-red-500">{queue.length} pendente{queue.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {queue.map((d) => (
        <DisputeCard key={d.id} dispute={d} />
      ))}
    </div>
  );
}
