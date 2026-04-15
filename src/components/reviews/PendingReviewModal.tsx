import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { PendingReview, useSubmitReview } from "@/hooks/usePendingReviews";

interface Props {
  pending: PendingReview;
  onClose: () => void;
}

const StarRow = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 active:scale-90 transition-transform"
          aria-label={`${n} estrelas para ${label}`}
        >
          <Star
            size={18}
            className={n <= value ? "text-primary" : "text-muted-foreground/30"}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  </div>
);

export default function PendingReviewModal({ pending, onClose }: Props) {
  const isClient = pending.reviewer_role === "client";
  const [pontualidade, setPontualidade] = useState(5);
  const [qualidade, setQualidade] = useState(5);
  const [comunicacao, setComunicacao] = useState(5);
  const [precoJusto, setPrecoJusto] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useSubmitReview();

  const avg = Math.round((pontualidade + qualidade + comunicacao + precoJusto) / 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit.mutateAsync({
      service_request_id: pending.service_request_id,
      client_id: isClient ? pending.reviewer_id : pending.reviewee_id,
      professional_id: isClient ? pending.reviewee_id : pending.reviewer_id,
      reviewer_role: pending.reviewer_role,
      rating: avg,
      comment: comment || undefined,
      pontualidade,
      qualidade,
      comunicacao,
      preco_justo: precoJusto,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-background w-full max-w-md rounded-2xl border border-border overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
              {isClient ? "Avaliar profissional" : "Avaliar cliente"}
            </p>
            <p className="font-display font-black text-sm text-foreground tracking-tight">
              {pending.reviewee_name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-1">
          <StarRow label="Pontualidade" value={pontualidade} onChange={setPontualidade} />
          <StarRow label={isClient ? "Qualidade do serviço" : "Respeito / postura"} value={qualidade} onChange={setQualidade} />
          <StarRow label="Comunicação" value={comunicacao} onChange={setComunicacao} />
          <StarRow
            label={isClient ? "Preço justo" : "Pagamento em dia"}
            value={precoJusto}
            onChange={setPrecoJusto}
          />

          <div className="pt-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-2">
              Comentário (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full bg-secondary/10 border border-border rounded-xl px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none"
              placeholder="Conte brevemente como foi a experiência..."
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border bg-secondary/5 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Nota final: <span className="text-foreground">{avg}★</span>
          </span>
          <button
            type="submit"
            disabled={submit.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
          >
            {submit.isPending && <Loader2 size={14} className="animate-spin" />}
            Enviar avaliação
          </button>
        </div>
      </form>
    </div>
  );
}
