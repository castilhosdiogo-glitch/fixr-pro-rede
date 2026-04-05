import { useState } from "react";
import { CheckCircle, XCircle, ExternalLink, User, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAdminKycQueue, useAdminReviewKyc, useKycFileUrl, type KycSubmission } from "@/hooks/useKyc";

function ImagePreview({ path, label }: { path: string | null; label: string }) {
  const { data: url } = useKycFileUrl(path);
  if (!path) return (
    <div className="w-full aspect-video rounded-xl bg-muted flex items-center justify-center">
      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Não enviado</p>
    </div>
  );
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="block relative group">
          <img
            src={url}
            alt={label}
            className="w-full aspect-video object-cover rounded-xl border border-border"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
            <ExternalLink size={18} className="text-white" />
          </div>
        </a>
      ) : (
        <div className="w-full aspect-video rounded-xl bg-muted animate-pulse" />
      )}
    </div>
  );
}

function KycCard({ submission }: { submission: KycSubmission }) {
  const { mutateAsync: review, isPending } = useAdminReviewKyc();
  const [expanded, setExpanded] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function handleApprove() {
    try {
      await review({ id: submission.id, action: "approved" });
      toast.success("KYC aprovado — profissional verificado.");
    } catch {
      toast.error("Erro ao aprovar.");
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.error("Informe o motivo da rejeição."); return; }
    try {
      await review({ id: submission.id, action: "rejected", rejection_reason: rejectReason });
      toast.success("KYC rejeitado e profissional notificado.");
      setShowRejectInput(false);
    } catch {
      toast.error("Erro ao rejeitar.");
    }
  }

  const submittedAt = new Date(submission.submitted_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-foreground truncate">
            {submission.full_legal_name}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
            {submission.document_type.toUpperCase()} · {submission.document_number}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex-shrink-0">
          <Clock size={10} className="text-yellow-500" />
          <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">
            {submission.status === "under_review" ? "Em análise" : "Pendente"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Submitted at */}
          <p className="text-[9px] text-muted-foreground">Enviado em {submittedAt}</p>

          {/* Document images */}
          <div className="grid grid-cols-3 gap-3">
            <ImagePreview path={submission.selfie_path} label="Selfie" />
            <ImagePreview path={submission.document_front_path} label="Frente" />
            <ImagePreview path={submission.document_back_path} label="Verso" />
          </div>

          {/* Actions */}
          {!showRejectInput ? (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={13} /> Aprovar
              </button>
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-black text-[10px] uppercase tracking-widest hover:bg-destructive/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <XCircle size={13} /> Rejeitar
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo da rejeição (será exibido ao profissional)..."
                rows={3}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-black text-[10px] uppercase tracking-widest hover:bg-destructive/90 transition-all disabled:opacity-50"
                >
                  {isPending ? "Enviando..." : "Confirmar rejeição"}
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="px-4 py-2.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function KycAdminPanel() {
  const { data: queue = [], isLoading } = useAdminKycQueue();

  if (isLoading) return (
    <div className="space-y-3">
      {[1,2].map(i => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-16" />
      ))}
    </div>
  );

  if (queue.length === 0) return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Nenhuma verificação pendente
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">
          Verificações KYC
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <FileText size={10} className="text-yellow-500" />
          <span className="text-[9px] font-black text-yellow-500">{queue.length} pendente{queue.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
      {queue.map((sub) => (
        <KycCard key={sub.id} submission={sub} />
      ))}
    </div>
  );
}
