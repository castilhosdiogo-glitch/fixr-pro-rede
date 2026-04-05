import { ShieldCheck, Star, Crown } from "lucide-react";
import type { VerificationLevel } from "@/hooks/useReputation";

interface VerificationBadgeProps {
  level: VerificationLevel;
  size?: "sm" | "md";
}

const CONFIG: Record<
  VerificationLevel,
  { label: string; icon: React.ReactNode; className: string }
> = {
  basic: {
    label: "BÁSICO",
    icon: <ShieldCheck size={10} />,
    className: "bg-secondary/30 text-muted-foreground border-border",
  },
  verified: {
    label: "VERIFICADO",
    icon: <ShieldCheck size={10} fill="currentColor" />,
    className: "bg-primary text-primary-foreground border-primary",
  },
  top: {
    label: "TOP Fixr",
    icon: <Crown size={10} fill="currentColor" />,
    className: "bg-emerald-500 text-white border-emerald-500",
  },
};

export default function VerificationBadge({ level, size = "sm" }: VerificationBadgeProps) {
  const cfg = CONFIG[level];

  if (level === "basic") return null; // Don't display basic — it's the default

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

/** Inline icon-only variant for compact contexts */
export function VerificationIcon({ level }: { level: VerificationLevel }) {
  if (level === "basic") return null;
  if (level === "top") return <Crown size={14} className="text-emerald-500 flex-shrink-0" fill="currentColor" />;
  return <ShieldCheck size={14} className="text-primary flex-shrink-0" fill="currentColor" />;
}

