import {
  Clock, Zap, ShieldCheck, Award, ThumbsUp, Activity, Crown, Sparkles,
} from "lucide-react";
import type { ReputationTag } from "@/hooks/useReputation";

const ICON_MAP: Record<string, React.ReactNode> = {
  Clock:      <Clock size={9} />,
  Zap:        <Zap size={9} />,
  ShieldCheck:<ShieldCheck size={9} />,
  Award:      <Award size={9} />,
  ThumbsUp:   <ThumbsUp size={9} />,
  Activity:   <Activity size={9} />,
  Crown:      <Crown size={9} />,
  Sparkles:   <Sparkles size={9} />,
};

/** Tag color priority by importance */
const TAG_STYLE: Record<string, string> = {
  top_profissional: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  bem_avaliado:     "bg-primary/10 text-primary border-primary/30",
  confiavel:        "bg-primary/10 text-primary border-primary/30",
  pontual:          "bg-blue-500/10 text-blue-600 border-blue-500/30",
  rapido:           "bg-blue-500/10 text-blue-600 border-blue-500/30",
  experiente:       "bg-secondary/30 text-foreground border-border",
  ativo:            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  novo:             "bg-secondary/30 text-muted-foreground border-border",
};

interface ReputationTagsProps {
  tags: ReputationTag[];
  maxVisible?: number;
  className?: string;
}

export default function ReputationTags({
  tags,
  maxVisible = 3,
  className = "",
}: ReputationTagsProps) {
  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visible.map((t) => (
        <span
          key={t.tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${
            TAG_STYLE[t.tag] ?? "bg-secondary/20 text-foreground border-border"
          }`}
        >
          {ICON_MAP[t.icon] ?? null}
          {t.label_pt}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border bg-secondary/10 text-[8px] font-black uppercase tracking-wider text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}
