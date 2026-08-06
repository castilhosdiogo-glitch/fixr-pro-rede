import { useState } from "react";
import { X, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { DISPUTE_REASON_LABELS, DisputeReason, useOpenDispute } from "@/hooks/useDisputes";

interface Props {
  serviceRequestId: string;
  serviceDescription: string;
  onClose: () => void;
}

export default function DisputeFormModal({ serviceRequestId, serviceDescription, onClose }: Props) {
  const [reason, setReason] = useState<DisputeReason>("qualidade_ruim");
  const [description, setDescription] = useState("");
  const openDispute = useOpenDispute();

  const canSubmit = description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Descreva o problema com pelo menos 10 caracteres.");
      return;
    }
    try {
      await openDispute.mutateAsync({ serviceRequestId, reason, description: description.trim() });
      toast.success("Contestação enviada. O pagamento foi retido até a análise do time Fixr.");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("dispute_window_expired")) {
        toast.error("O prazo de 7 dias para contestar esse serviço já passou.");
      } else if (msg.includes("dispute_already_open")) {
        toast.error("Já existe uma contestação em andamento para esse serviço.");
      } else {
        toast.error("Erro ao enviar contestação.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full sm:max-w-sm bg-card border border-border rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-red-500" /> Contestar serviço
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed truncate">{serviceDescription}</p>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Motivo</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DisputeReason)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
          >
            {Object.entries(DISPUTE_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Descreva o que aconteceu
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Conte com detalhes o que houve de errado..."
            maxLength={2000}
            rows={4}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
          />
        </div>

        <p className="text-[9px] text-muted-foreground leading-relaxed">
          O pagamento será retido até o time Fixr analisar o caso, incluindo o histórico de
          check-ins registrados durante o serviço.
        </p>

        <button
          onClick={handleSubmit}
          disabled={openDispute.isPending || !canSubmit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
        >
          {openDispute.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
          {openDispute.isPending ? "Enviando..." : "Enviar contestação"}
        </button>
      </div>
    </div>
  );
}
