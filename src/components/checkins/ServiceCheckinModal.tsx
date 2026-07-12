import { useState } from "react";
import { ThumbsUp, ThumbsDown, X, Loader2 } from "lucide-react";
import { ServiceCheckin, useSubmitCheckin } from "@/hooks/useServiceCheckins";

interface Props {
  checkin: ServiceCheckin;
  onClose: () => void;
}

export default function ServiceCheckinModal({ checkin, onClose }: Props) {
  const [comment, setComment] = useState("");
  const [choice, setChoice] = useState<"ok" | "problem" | null>(null);
  const submit = useSubmitCheckin();

  const handleSubmit = async (response: "ok" | "problem") => {
    setChoice(response);
    try {
      await submit.mutateAsync({ checkinId: checkin.id, response, comment });
      onClose();
    } catch {
      setChoice(null);
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

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSubmit("ok")}
            disabled={submit.isPending}
            className="flex flex-col items-center gap-2 py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {submit.isPending && choice === "ok" ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ThumbsUp size={20} />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">Tá bom</span>
          </button>
          <button
            onClick={() => handleSubmit("problem")}
            disabled={submit.isPending}
            className="flex flex-col items-center gap-2 py-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {submit.isPending && choice === "problem" ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <ThumbsDown size={20} />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest">Tem problema</span>
          </button>
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentário opcional..."
          maxLength={500}
          rows={2}
          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
    </div>
  );
}
