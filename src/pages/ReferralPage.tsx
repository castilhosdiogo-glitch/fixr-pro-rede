import { useState } from "react";
import { ArrowLeft, Users, Gift, Trophy, TrendingUp, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyReferralStats } from "@/hooks/useReferral";
import { ReferralLinkCard } from "@/components/referral/ReferralLinkCard";
import { ReferralsList } from "@/components/referral/ReferralsList";
import { RewardsTimeline } from "@/components/referral/RewardsTimeline";
import { ReferralLeaderboard } from "@/components/referral/ReferralLeaderboard";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

type Tab = "link" | "indicacoes" | "recompensas" | "ranking";

const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: "link",        label: "Meu Link",     icon: Link2      },
  { id: "indicacoes",  label: "Indicações",   icon: Users      },
  { id: "recompensas", label: "Recompensas",  icon: Gift       },
  { id: "ranking",     label: "Ranking",      icon: Trophy     },
];

// ─── Milestone progress bar ───────────────────────────────────

const MilestoneBadge = ({ activeCount }: { activeCount: number }) => {
  const milestones = [
    { at: 1,  label: "1ª indicação",  reward: "1 mês grátis"           },
    { at: 3,  label: "3 indicações",  reward: "Boost ranking 60 dias"  },
    { at: 10, label: "10 indicações", reward: "Boost ranking 120 dias" },
    { at: 25, label: "25 indicações", reward: "Boost ranking 1 ano"    },
  ];

  const next = milestones.find((m) => m.at > activeCount);
  const last = milestones.filter((m) => m.at <= activeCount).at(-1);

  if (!next) return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">
        🏆 Você atingiu todos os marcos!
      </p>
    </div>
  );

  const pct = last ? ((activeCount - last.at) / (next.at - (last?.at ?? 0))) * 100 : (activeCount / next.at) * 100;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Próximo marco
        </p>
        <span className="text-[9px] font-black text-primary tabular-nums">
          {activeCount}/{next.at}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[8px] font-bold">
        <span className="text-muted-foreground">{next.label}</span>
        <span className="text-primary font-black">{next.reward}</span>
      </div>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────

const ReferralPage = () => {
  const navigate = useNavigate();
  const { data: stats } = useMyReferralStats();
  const [tab, setTab] = useState<Tab>("link");

  const statCards = [
    {
      label: "Total enviados",
      value: stats?.total_referrals ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Ativos",
      value: stats?.active_count ?? 0,
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
    {
      label: "Meses ganhos",
      value: stats?.months_earned ?? 0,
      icon: Gift,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Cliques no link",
      value: stats?.clicks ?? 0,
      icon: Link2,
      color: "text-muted-foreground",
      bg: "bg-secondary/20",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Indicar Amigos | Fixr"
        description="Indique colegas profissionais e ganhe meses grátis, destaque e posição privilegiada no ranking."
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-black text-xs uppercase tracking-[0.3em] text-foreground">
              Indicar & Crescer
            </h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Programa de Indicação Fixr
            </p>
          </div>
          {(stats?.active_count ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30">
              <TrendingUp size={11} className="text-green-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-green-400">
                {stats?.active_count} ativo{(stats?.active_count ?? 0) > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2"
        >
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-3 text-center space-y-1">
              <div className={`w-7 h-7 rounded-xl ${bg} mx-auto flex items-center justify-center`}>
                <Icon size={13} className={color} />
              </div>
              <p className={`font-display font-black text-xl tabular-nums ${color}`}>{value}</p>
              <p className="text-[7px] font-black uppercase tracking-widest text-muted-foreground leading-tight">
                {label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Milestone progress */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <MilestoneBadge activeCount={stats?.active_count ?? 0} />
        </motion.div>

        {/* Tab bar */}
        <div className="grid grid-cols-4 gap-1 bg-secondary/10 rounded-2xl p-1 border border-border">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${
                tab === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {tab === "link"        && <ReferralLinkCard />}
          {tab === "indicacoes"  && <ReferralsList />}
          {tab === "recompensas" && <RewardsTimeline />}
          {tab === "ranking"     && <ReferralLeaderboard />}
        </motion.div>

        {/* Reward tiers explainer */}
        {tab === "link" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground border-l-2 border-primary pl-3">
              Como ganhar recompensas
            </h3>
            {[
              {
                tier: 1,
                condition: "Indicado completa o perfil",
                reward: "+1 mês de assinatura grátis",
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                tier: 2,
                condition: "Indicado completa o primeiro serviço",
                reward: "+1 mês grátis + 30 dias de destaque na busca",
                color: "text-yellow-400",
                bg: "bg-yellow-500/10",
              },
              {
                tier: 3,
                condition: "Você atinge 3 indicações ativas",
                reward: "Ranking boost por 60 dias",
                color: "text-green-400",
                bg: "bg-green-500/10",
              },
            ].map(({ tier, condition, reward, color, bg }) => (
              <div key={tier} className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full ${bg} border border-current/20 ${color} text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {tier}
                </span>
                <div>
                  <p className="text-[10px] font-bold text-foreground">{condition}</p>
                  <p className={`text-[9px] font-black ${color} mt-0.5`}>{reward}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReferralPage;

