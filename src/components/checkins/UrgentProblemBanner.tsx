import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUrgentCheckinProblems, useAcknowledgeCheckinProblem } from "@/hooks/useServiceCheckins";

export default function UrgentProblemBanner() {
  const { data: problems = [] } = useUrgentCheckinProblems();
  const { mutateAsync: acknowledge, isPending } = useAcknowledgeCheckinProblem();

  if (!problems.length) return null;

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledge(id);
    } catch {
      toast.error("Erro ao marcar como lida.");
    }
  };

  return (
    <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 p-4 mb-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={16} className="text-red-600 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest text-red-700">
          Cliente reportou problema ({problems.length})
        </span>
      </div>
      <div className="space-y-2">
        {problems.map((p) => (
          <div key={p.id} className="rounded-xl bg-background border border-red-500/30 p-3 space-y-2">
            <div>
              <p className="text-xs font-black text-foreground truncate">{p.service_description}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                {p.client_name} · {p.responded_at ? new Date(p.responded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
              </p>
            </div>
            <p className="text-xs text-foreground leading-relaxed">"{p.comment}"</p>
            <button
              onClick={() => handleAcknowledge(p.id)}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500 text-white font-black text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              Marcar como lida
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
