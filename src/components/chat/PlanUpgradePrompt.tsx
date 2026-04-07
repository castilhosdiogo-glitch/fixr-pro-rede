import { Link } from "react-router-dom";
import { Crown, Lock } from "lucide-react";

interface PlanUpgradePromptProps {
  message: string;
  compact?: boolean;
}

export function PlanUpgradePrompt({ message, compact = false }: PlanUpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
        <Lock size={12} className="text-primary flex-shrink-0" />
        <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-tight flex-1">
          {message}
        </p>
        <Link
          to="/#planos"
          className="text-[9px] font-black uppercase tracking-widest text-primary underline flex-shrink-0"
        >
          VER PLANOS
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-primary/5 border-2 border-primary/20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
        <Crown size={22} className="text-primary" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground leading-relaxed max-w-[240px]">
        {message}
      </p>
      <Link
        to="/#planos"
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
      >
        FAZER UPGRADE
      </Link>
    </div>
  );
}
