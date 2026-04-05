import { Trophy, Medal, Award, Crown } from "lucide-react";
import { useReferralLeaderboard, useMyReferralStats } from "@/hooks/useReferral";
import { useAuth } from "@/hooks/useAuth";

// Position icon
const PositionIcon = ({ pos }: { pos: number }) => {
  if (pos === 1) return <Crown   size={14} className="text-yellow-400" />;
  if (pos === 2) return <Medal   size={14} className="text-zinc-400" />;
  if (pos === 3) return <Award   size={14} className="text-amber-600" />;
  return <span className="text-[10px] font-black text-muted-foreground tabular-nums w-4 text-center">#{pos}</span>;
};

export const ReferralLeaderboard = () => {
  const { user } = useAuth();
  const { data: entries = [], isLoading } = useReferralLeaderboard(15);
  const { data: myStats } = useMyReferralStats();

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-secondary/20" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-secondary/5 p-8 text-center">
        <Trophy size={28} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Ranking ainda sem dados
        </p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const isOnLeaderboard = entries.some((e) => e.user_id === user?.id);

  return (
    <div className="space-y-4">
      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-2">
        {/* 2nd place — left */}
        {top3[1] && (
          <div className="order-1 flex flex-col items-center gap-2 pt-6">
            <div className={`w-12 h-12 rounded-2xl ${top3[1].user_id === user?.id ? "bg-primary" : "bg-secondary/30"} border border-border flex items-center justify-center text-[10px] font-black text-foreground`}>
              {top3[1].full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <Medal size={14} className="text-zinc-400" />
            <p className="text-[8px] font-black uppercase tracking-widest text-foreground text-center truncate w-full">
              {top3[1].full_name.split(" ")[0]}
            </p>
            <p className="font-display font-black text-xl text-foreground tabular-nums">
              {top3[1].active_referrals}
            </p>
            <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">ativos</p>
          </div>
        )}

        {/* 1st place — center, taller */}
        {top3[0] && (
          <div className="order-2 flex flex-col items-center gap-2">
            <Crown size={16} className="text-yellow-400" />
            <div className={`w-14 h-14 rounded-2xl ${top3[0].user_id === user?.id ? "bg-primary" : "bg-yellow-500/20"} border ${top3[0].user_id === user?.id ? "border-primary" : "border-yellow-500/30"} flex items-center justify-center text-[11px] font-black text-foreground`}>
              {top3[0].full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <p className="text-[8px] font-black uppercase tracking-widest text-yellow-400 text-center truncate w-full">
              {top3[0].full_name.split(" ")[0]}
            </p>
            <p className="font-display font-black text-2xl text-foreground tabular-nums">
              {top3[0].active_referrals}
            </p>
            <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">ativos</p>
          </div>
        )}

        {/* 3rd place — right */}
        {top3[2] && (
          <div className="order-3 flex flex-col items-center gap-2 pt-6">
            <div className={`w-12 h-12 rounded-2xl ${top3[2].user_id === user?.id ? "bg-primary" : "bg-secondary/30"} border border-border flex items-center justify-center text-[10px] font-black text-foreground`}>
              {top3[2].full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <Award size={14} className="text-amber-600" />
            <p className="text-[8px] font-black uppercase tracking-widest text-foreground text-center truncate w-full">
              {top3[2].full_name.split(" ")[0]}
            </p>
            <p className="font-display font-black text-xl text-foreground tabular-nums">
              {top3[2].active_referrals}
            </p>
            <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">ativos</p>
          </div>
        )}
      </div>

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((entry) => {
            const isMe = entry.user_id === user?.id;
            const initials = entry.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                  isMe
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                <div className="w-5 flex items-center justify-center flex-shrink-0">
                  <PositionIcon pos={entry.position} />
                </div>
                <div className="w-8 h-8 rounded-xl bg-secondary/30 border border-border flex items-center justify-center text-[9px] font-black text-muted-foreground flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.full_name}{isMe && " (você)"}
                  </p>
                  <p className="text-[8px] font-bold text-muted-foreground">
                    {entry.category_name ?? "Profissional"} · {entry.city ?? "—"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-display font-black text-lg tabular-nums ${isMe ? "text-primary" : "text-foreground"}`}>
                    {entry.active_referrals}
                  </p>
                  <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">ativos</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* My position (if not in top 15) */}
      {!isOnLeaderboard && myStats && myStats.active_count > 0 && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sua posição</span>
          <div className="flex-1" />
          <p className="font-display font-black text-lg text-primary tabular-nums">
            {myStats.active_count} ativos
          </p>
        </div>
      )}
    </div>
  );
};
