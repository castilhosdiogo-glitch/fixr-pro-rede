import { useState } from "react";
import { ThumbsUp, ThumbsDown, X, Loader2, AlertTriangle } from "lucide-react";
import { ServiceCheckin, useSubmitCheckin } from "@/hooks/useServiceCheckins";

interface Props {
  checkin: ServiceCheckin;
  onClose: () => void;
}

export default function ServiceCheckinModal({ checkin, onClose }: Props) {
  const [comment, setComment] = useState("");
  const [reportingProblem, setReportingProblem] = useState(false);
  const [error, setError] = useState("");
  const submit = useSubmitCheckin();

  const handleOk = async () => {
    try {
      await submit.mutateAsync({ checkinId: checkin.id, response: "ok", comment });
      onClose();
    } catch {
      // erro já fica visível via isPending caindo — usuário pode tentar de novo
    }
  };

  const handleConfirmProblem = async () => {
    if (!comment.trim()) {
      setError("Descreva o que está acontecendo — é obrigatório pra avisar o profissional.");
      return;
    }
    setError("");
    try {
      await submit.mutateAsync({ checkinId: checkin.id, response: "problem", comment });
      onClose();
    } catch {
      // deixa o modal aberto pra tentar de novo
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full sm:max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Como está indo o serviço?
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {checkin.service_description} — checkpoint em {checkin.checkpoint_pct}% do tempo estimado.
        </p>

        {!reportingProblem ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleOk}
              disabled={submit.isPending}
              className="flex flex-col items-center gap-2 py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {submit.isPending ? <Loader2 size={20} className="animate-spin" /> : <ThumbsUp size={20} />}
              <span className="text-[9px] font-black uppercase tracking-widest">Tá bom</span>
            </button>
            <button
              onClick={() => setReportingProblem(true)}
              disabled={submit.isPending}
              className="flex flex-col items-center gap-2 py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <ThumbsDown size={20} />
              <span className="text-[9px] font-black uppercase tracking-widest">Tem problema</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={11} /> O que está acontecendo? (obrigatório)
            </p>
            <textarea
              autoFocus
              value={comment}
              onChange={(e) => { setComment(e.target.value); if (error) setError(""); }}
              placeholder="Descreva o problema — o profissional será avisado na hora..."
              maxLength={500}
              rows={3}
              className={`w-full bg-background border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 resize-none ${
                error ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-primary"
              }`}
            />
            {error && <p className="text-[9px] text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleConfirmProblem}
                disabled={submit.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {submit.isPending ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />}
                {submit.isPending ? "Enviando..." : "Avisar profissional agora"}
              </button>
              <button
                onClick={() => { setReportingProblem(false); setError(""); }}
                className="px-4 py-2.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
