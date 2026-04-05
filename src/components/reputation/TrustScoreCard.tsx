import { motion } from "framer-motion";
import { Info } from "lucide-react";
import TrustScoreBadge from "./TrustScoreBadge";
import VerificationBadge from "./VerificationBadge";
import ReputationTags from "./ReputationTags";
import TrustSignals from "./TrustSignals";
import type { ProfessionalReputation, TrustScoreBreakdown } from "@/hooks/useReputation";
import { useState } from "react";

interface TrustScoreCardProps {
  reputation: ProfessionalReputation;
  breakdown?: TrustScoreBreakdown;
  showBreakdown?: boolean;
}

const BREAKDOWN_LABELS = [
  { key: "rating_points",     label: "Avaliações",    max: 35, color: "bg-primary" },
  { key: "completed_points",  label: "Serviços",      max: 25, color: "bg-blue-500" },
  { key: "response_points",   label: "Tempo Resp.",   max: 20, color: "bg-emerald-500" },
  { key: "acceptance_points", label: "Aceitação",     max: 15, color: "bg-yellow-500" },
  { key: "activity_points",   label: "Atividade",     max: 5,  color: "bg-purple-500" },
];

export default function TrustScoreCard({
  reputation,
  breakdown,
  showBreakdown = false,
}: TrustScoreCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <TrustScoreBadge
          score={reputation.trust_score}
          level={reputation.verification_level}
          size="lg"
          showLabel
          animated
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              TRUST SCORE
            </span>
            <VerificationBadge level={reputation.verification_level} />
            {showBreakdown && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Ver detalhes do score"
              >
                <Info size={14} />
              </button>
            )}
          </div>

          <ReputationTags tags={reputation.tags} maxVisible={3} />
        </div>
      </div>

      {/* Metrics row */}
      <div className="p-4">
        <TrustSignals
          completedCount={reputation.completed_count}
          responseTimeDisplay={reputation.response_time_display}
          responseRatePct={reputation.response_rate_pct}
          activityStatus={reputation.activity_status}
          layout="row"
        />
      </div>

      {/* Score breakdown (collapsible) */}
      {showBreakdown && breakdown && open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-border px-4 pb-4 pt-3"
        >
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            COMPOSIÇÃO DO SCORE
          </p>
          <div className="space-y-2">
            {BREAKDOWN_LABELS.map(({ key, label, max, color }) => {
              const pts = (breakdown as Record<string, number>)[key];
              const pct = (pts / max) * 100;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground w-20 shrink-0">
                    {label}
                  </span>
                  <div className="flex-1 h-1.5 bg-secondary/30 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-[8px] font-black text-foreground w-12 text-right shrink-0">
                    {pts.toFixed(1)} / {max}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/50 mt-3">
            Atualizado: {breakdown.computed_at ? new Date(breakdown.computed_at).toLocaleDateString("pt-BR") : "—"}
          </p>
        </motion.div>
      )}
    </div>
  );
}
