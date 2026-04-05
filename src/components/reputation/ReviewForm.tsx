import { useState } from "react";
import { Star, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { useSubmitReview } from "@/hooks/useReputation";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  professionalId: string;
  serviceRequestId: string;
  professionalName: string;
  onSuccess?: () => void;
}

export default function ReviewForm({
  professionalId,
  serviceRequestId,
  professionalName,
  onSuccess,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);

  const { mutate, isPending } = useSubmitReview();
  const { toast } = useToast();

  const submit = () => {
    if (rating === 0) return;
    const safeComment = comment.trim()
      ? DOMPurify.sanitize(comment.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
      : undefined;

    mutate(
      { professional_id: professionalId, service_request_id: serviceRequestId, rating, comment: safeComment },
      {
        onSuccess: () => {
          setDone(true);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast({
            title: "Não foi possível enviar avaliação",
            description: err.message?.includes("completion")
              ? "O serviço precisa estar concluído para avaliar."
              : "Tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <Star size={20} className="text-emerald-500" fill="currentColor" />
        </div>
        <p className="font-display font-black text-sm uppercase tracking-wider text-foreground">
          Avaliação enviada!
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Obrigado por avaliar {professionalName}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">
          Avaliar {professionalName}
        </p>
        <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-muted-foreground ml-auto">
          <Lock size={9} />
          SERVIÇO VERIFICADO
        </span>
      </div>

      {/* Star selector */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(s)}
            className="transition-transform active:scale-90"
          >
            <Star
              size={28}
              className={`transition-colors ${
                s <= (hover || rating)
                  ? "text-primary fill-primary"
                  : "text-border"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Comment (optional) */}
      <AnimatePresence>
        {rating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Compartilhe sua experiência (opcional)..."
              rows={3}
              maxLength={500}
              className="w-full bg-secondary/10 border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary transition-colors font-medium"
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/60">
                {comment.length}/500
              </span>
              {rating < 3 && (
                <span className="text-[8px] font-black uppercase tracking-wider text-yellow-500">
                  Feedback negativo é anônimo e interno
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={submit}
        disabled={rating === 0 || isPending}
        className="w-full py-3 bg-primary text-primary-foreground font-display font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
      >
        {isPending ? "Enviando..." : "Enviar Avaliação"}
      </button>
    </div>
  );
}
