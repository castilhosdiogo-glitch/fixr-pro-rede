import { motion } from "framer-motion";
import type { VerificationLevel } from "@/hooks/useReputation";

interface TrustScoreBadgeProps {
  score: number;
  level: VerificationLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

const SIZE = {
  sm: { r: 18, stroke: 4, cx: 24, fontSize: "text-[9px]", container: "w-12 h-12" },
  md: { r: 26, stroke: 5, cx: 32, fontSize: "text-xs",    container: "w-16 h-16" },
  lg: { r: 38, stroke: 6, cx: 46, fontSize: "text-sm",    container: "w-24 h-24" },
};

function scoreColor(score: number) {
  if (score >= 85) return { stroke: "stroke-emerald-500", text: "text-emerald-500", fill: "#10b981" };
  if (score >= 65) return { stroke: "stroke-primary",     text: "text-primary",     fill: "hsl(var(--primary))" };
  if (score >= 40) return { stroke: "stroke-yellow-500",  text: "text-yellow-500",  fill: "#eab308" };
  return               { stroke: "stroke-muted-foreground", text: "text-muted-foreground", fill: "hsl(var(--muted-foreground))" };
}

const LEVEL_LABEL: Record<VerificationLevel, string> = {
  basic:    "BÁSICO",
  verified: "VERIFICADO",
  top:      "TOP",
};

export default function TrustScoreBadge({
  score,
  level,
  size = "md",
  showLabel = false,
  animated = true,
}: TrustScoreBadgeProps) {
  const cfg = SIZE[size];
  const colors = scoreColor(score);
  const circumference = 2 * Math.PI * cfg.r;
  const progress = (score / 100) * circumference;
  const gap = circumference - progress;

  const svgSize = cfg.cx * 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative ${cfg.container} flex items-center justify-center`}>
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="-rotate-90"
        >
          {/* Track */}
          <circle
            cx={cfg.cx}
            cy={cfg.cx}
            r={cfg.r}
            fill="none"
            className="stroke-border"
            strokeWidth={cfg.stroke}
          />
          {/* Progress arc */}
          <motion.circle
            cx={cfg.cx}
            cy={cfg.cx}
            r={cfg.r}
            fill="none"
            className={colors.stroke}
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={animated ? { strokeDashoffset: gap } : { strokeDashoffset: gap }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        {/* Score number */}
        <span className={`absolute font-display font-black ${cfg.fontSize} ${colors.text} tracking-tighter`}>
          {score}
        </span>
      </div>

      {showLabel && (
        <span className={`text-[8px] font-black uppercase tracking-widest ${colors.text}`}>
          {LEVEL_LABEL[level]}
        </span>
      )}
    </div>
  );
}
