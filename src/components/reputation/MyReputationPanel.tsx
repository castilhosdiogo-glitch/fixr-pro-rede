import { motion } from "framer-motion";
import { TrendingUp, RefreshCw } from "lucide-react";
import TrustScoreBadge from "./TrustScoreBadge";
import VerificationBadge from "./VerificationBadge";
import ReputationTags from "./ReputationTags";
import TrustSignals from "./TrustSignals";
import { useMyReputation, useMyTrustBreakdown, useRecomputeTrustScore } from "@/hooks/useReputation";
import { useAuth } from "@/hooks/useAuth";

const BREAKDOWN_ITEMS = [
  { key: "rating_points",     label: "Avaliações",          max: 35, tip: "Baseado na nota média ponderada",           color: "bg-primary" },
  { key: "completed_points",  label: "Serviços Concluídos", max: 25, tip: "Cresce conforme número de serviços",        color: "bg-blue-500" },
  { key: "response_points",   label: "Tempo de Resposta",   max: 20, tip: "Mais rápido = mais pontos",                 color: "bg-emerald-500" },
  { key: "acceptance_points", label: "Taxa de Aceitação",   max: 15, tip: "Aceitar mais solicitações aumenta o score", color: "bg-yellow-500" },
  { key: "activity_points",   label: "Atividade Recente",   max: 5,  tip: "Estar ativo nos últimos dias",             color: "bg-purple-500" },
];

const LEVEL_THRESHOLDS = [
  { level: "top",      score: 85, reviews: 10, acceptance: 80, label: "TOP Fixr",   color: "text-emerald-500" },
  { level: "verified", score: 0,  reviews: 0,  acceptance: 0,  label: "VERIFICADO",   color: "text-primary" },
];

export default function MyReputationPanel() {
  const { user } = useAuth();
  const { data: rep, isLoading: repLoading } = useMyReputation();
  const { data: breakdown, isLoading: bdLoading } = useMyTrustBreakdown();
  const { mutate: recompute, isPending: recomputing } = useRecomputeTrustScore();

  if (repLoading || bdLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-secondary/30 rounded w-1/3" />
          <div className="h-16 bg-secondary/30 rounded" />
          <div className="h-8 bg-secondary/30 rounded" />
        </div>
      </div>
    );
  }

  if (!rep || !breakdown) return null;

  const nextThreshold = rep.trust_score < 85 ? LEVEL_THRESHOLDS[0] : null;
  const ptsToNext = nextThreshold ? Math.max(0, nextThreshold.score - rep.trust_score) : 0;

  return (
    <div className="space-y-3">
      {/* Score card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            SEU TRUST SCORE
          </span>
          <button
            onClick={() => recompute(user!.id)}
            disabled={recomputing}
            className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <RefreshCw size={10} className={recomputing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        <div className="flex items-center gap-5 p-5">
          <TrustScoreBadge
            score={rep.trust_score}
            level={rep.verification_level}
            size="lg"
            showLabel
          />

          <div className="flex-1 min-w-0 space-y-3">
            <VerificationBadge level={rep.verification_level} />
            <ReputationTags tags={rep.tags} maxVisible={4} />

            {/* Next level progress */}
            {nextThreshold && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                    Próximo nível: <span className={nextThreshold.color}>{nextThreshold.label}</span>
                  </span>
                  <span className="text-[8px] font-black text-muted-foreground">
                    Faltam {ptsToNext} pts
                  </span>
                </div>
                <div className="h-1 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(rep.trust_score / nextThreshold.score) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Metrics grid */}
        <TrustSignals
          completedCount={rep.completed_count}
          responseTimeDisplay={rep.response_time_display}
          responseRatePct={rep.response_rate_pct}
          activityStatus={rep.activity_status}
          layout="grid"
        />
      </div>

      {/* Score breakdown */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            COMPOSIÇÃO DO SCORE
          </span>
        </div>

        <div className="space-y-3">
          {BREAKDOWN_ITEMS.map(({ key, label, max, tip, color }) => {
            const pts = (breakdown as Record<string, number>)[key];
            const pct = (pts / max) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-foreground">
                    {label}
                  </span>
                  <span className="text-[9px] font-black text-muted-foreground">
                    {pts.toFixed(1)} <span className="text-muted-foreground/50">/ {max}</span>
                  </span>
                </div>
                <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
                  />
                </div>
                <p className="text-[7px] font-black uppercase tracking-wider text-muted-foreground/50 mt-0.5">
                  {tip}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/40 mt-4 pt-3 border-t border-border">
          Última atualização: {new Date(breakdown.computed_at).toLocaleString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

