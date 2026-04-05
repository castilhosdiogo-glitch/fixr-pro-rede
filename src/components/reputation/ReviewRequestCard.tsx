import { Star } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReviewForm from "./ReviewForm";

interface ReviewRequestCardProps {
  serviceRequestId: string;
  professionalId: string;
  professionalName: string;
  serviceDescription: string;
  onDone?: () => void;
}

export default function ReviewRequestCard({
  serviceRequestId,
  professionalId,
  professionalName,
  serviceDescription,
  onDone,
}: ReviewRequestCardProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3">
        <Star size={16} className="text-emerald-500 flex-shrink-0" fill="currentColor" />
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
          Avaliação enviada para {professionalName}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-primary/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-primary/5">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Star size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-foreground">
            Avalie {professionalName}
          </p>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">
            {serviceDescription}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-[8px] font-black uppercase tracking-wider text-primary hover:text-primary/80 transition-colors flex-shrink-0"
        >
          {open ? "Fechar" : "Avaliar"}
        </button>
      </div>

      {/* Expandable form */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-border">
              <ReviewForm
                professionalId={professionalId}
                serviceRequestId={serviceRequestId}
                professionalName={professionalName}
                onSuccess={() => {
                  setDone(true);
                  onDone?.();
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
