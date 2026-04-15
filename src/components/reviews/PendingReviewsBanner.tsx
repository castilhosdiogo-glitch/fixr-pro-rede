import { useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import PendingReviewModal from "./PendingReviewModal";

const hoursLeft = (dueAt: string) => {
  const diff = new Date(dueAt).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 3_600_000));
};

export default function PendingReviewsBanner() {
  const { data: pending = [] } = usePendingReviews();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!pending.length) return null;

  const active = pending.find((p) => p.id === activeId);
  const overdue = pending.filter((p) => new Date(p.due_at).getTime() < Date.now()).length;
  const blocking = pending.filter(
    (p) => p.reviewer_role === "professional" && p.blocks_at && new Date(p.blocks_at).getTime() < Date.now()
  ).length;

  return (
    <>
      <div className={`rounded-2xl border p-4 mb-4 ${
        blocking > 0
          ? "border-red-300 bg-red-50"
          : overdue > 0
          ? "border-amber-300 bg-amber-50"
          : "border-border bg-card"
      }`}>
        <div className="flex items-center gap-2 mb-3">
          {blocking > 0 ? (
            <AlertTriangle size={14} className="text-red-600" />
          ) : (
            <Clock size={14} className="text-primary" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            {blocking > 0
              ? `Você está bloqueado — ${blocking} avaliação pendente`
              : `Avaliações pendentes (${pending.length})`}
          </span>
        </div>

        {blocking > 0 && (
          <p className="text-xs text-red-900 mb-3 leading-relaxed">
            Avalie os clientes abaixo para voltar a receber novos pedidos.
          </p>
        )}

        <ul className="flex flex-col gap-1.5">
          {pending.slice(0, 5).map((p) => {
            const h = hoursLeft(p.due_at);
            const isClient = p.reviewer_role === "client";
            return (
              <li key={p.id}>
                <button
                  onClick={() => setActiveId(p.id)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-background border border-border rounded-xl hover:border-primary transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground truncate">{p.reviewee_name}</p>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {isClient ? "Avaliar profissional" : "Avaliar cliente"}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      h <= 0 ? "text-red-600" : h <= 12 ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {h <= 0 ? "Vencido" : `${h}h restantes`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {active && <PendingReviewModal pending={active} onClose={() => setActiveId(null)} />}
    </>
  );
}
