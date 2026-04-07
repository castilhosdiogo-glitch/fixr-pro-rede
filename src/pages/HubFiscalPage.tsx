import { useState } from "react";
import { ArrowLeft, FileText, AlertTriangle, TrendingUp, Bell, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

interface MEITracking {
  faturamento_fixr: number;
  alerta_70_enviado: boolean;
  alerta_90_enviado: boolean;
  alerta_100_enviado: boolean;
  ano: number;
}

const MEI_LIMIT = 81_000;

function ProgressBar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-3 bg-secondary/20 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LockedFeature({ title, desc, upgradeMsg }: { title: string; desc: string; upgradeMsg: string }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border-2 border-border bg-secondary/10 p-6 opacity-60">
      <div className="flex items-center gap-3 mb-3">
        <Lock size={16} className="text-muted-foreground flex-shrink-0" />
        <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{desc}</p>
      <button onClick={() => navigate("/#planos")}
        className="text-[9px] font-black uppercase tracking-widest text-primary border border-primary/30 px-4 py-2 rounded-xl hover:bg-primary/10 transition-colors">
        VER PLANOS →
      </button>
    </div>
  );
}

const HubFiscalPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan, can, upgradeMessage } = usePlanGate();

  const canUseHubFiscal = can("hubFiscal");
  const canUseMeiAlert = can("meiAlert");

  const { data: meiTracking } = useQuery<MEITracking | null>({
    queryKey: ["mei-tracking", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mei_revenue_tracking")
        .select("*")
        .eq("profissional_id", user!.id)
        .eq("ano", new Date().getFullYear())
        .single();
      return data as MEITracking | null;
    },
    enabled: !!user && canUseMeiAlert,
  });

  const faturamento = meiTracking?.faturamento_fixr ?? 0;
  const pctMEI = Math.round((faturamento / MEI_LIMIT) * 100);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Hub Fiscal | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">HUB FISCAL</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-0.5">
              {plan === "explorador" ? "DISPONÍVEL NO PARCEIRO+" : plan.toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Banner de upgrade para Explorador */}
        {plan === "explorador" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6">
            <p className="font-display font-black text-sm uppercase tracking-tighter text-foreground mb-2">
              ACESSE O HUB FISCAL
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Emita NFS-e, receba alertas de DAS e faça sua guia MEI com o plano Parceiro ou Elite.
            </p>
            <PlanUpgradePrompt message={upgradeMessage("hubFiscal")} compact />
          </motion.div>
        )}

        {/* NFS-e */}
        {canUseHubFiscal ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-border bg-secondary/10 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-border flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">EMISSÃO DE NFS-e</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">NOTA FISCAL DE SERVIÇO ELETRÔNICA</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Emita notas fiscais para seus serviços realizados via Fixr, integrado com a prefeitura da sua cidade.
            </p>
            <button className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.2em] active:scale-[0.98]">
              EMITIR NFS-e
            </button>
          </motion.div>
        ) : (
          <LockedFeature title="EMISSÃO DE NFS-e" desc="Emita notas fiscais de serviço eletrônicas para seus clientes." upgradeMsg={upgradeMessage("nfse")} />
        )}

        {/* Alertas DAS */}
        {canUseHubFiscal ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-border bg-secondary/10 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border-2 border-border flex items-center justify-center">
                <AlertTriangle size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">ALERTAS DE DAS</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">GUIA DE PAGAMENTO DO MEI</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Receba notificações push antes do vencimento da sua guia DAS mensal. Nunca pague multa por atraso.
            </p>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <Bell size={16} className="text-green-500 flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-green-500">ALERTAS ATIVOS</p>
            </div>
          </motion.div>
        ) : (
          <LockedFeature title="ALERTAS DE DAS" desc="Receba notificações antes do vencimento da sua guia DAS mensal." upgradeMsg={upgradeMessage("das")} />
        )}

        {/* Guia MEI */}
        {canUseHubFiscal ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-border bg-secondary/10 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-border flex items-center justify-center">
                <TrendingUp size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">GUIA MEI ASSISTIDO</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">FORMALIZE-SE EM MINUTOS</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Passo a passo guiado para se formalizar como MEI no portal Gov.br. Rápido, gratuito e sem burocracia.
            </p>
            <button className="w-full py-4 rounded-xl border-2 border-primary text-primary font-display font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/10 transition-colors active:scale-[0.98]">
              COMEÇAR FORMALIZAÇÃO
            </button>
          </motion.div>
        ) : (
          <LockedFeature title="GUIA MEI ASSISTIDO" desc="Passo a passo para se formalizar como MEI no portal Gov.br." upgradeMsg={upgradeMessage("guiaMei")} />
        )}

        {/* Alerta de Limite MEI — Elite only */}
        {canUseMeiAlert ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/5 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center">
                <Bell size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">ALERTA DE LIMITE MEI</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">EXCLUSIVO ELITE</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  FATURAMENTO {new Date().getFullYear()} VIA FIXR
                </p>
                <p className="font-display font-black text-lg text-foreground">
                  {pctMEI}%
                </p>
              </div>
              <ProgressBar value={faturamento} max={MEI_LIMIT} />
              <div className="flex justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  R${faturamento.toLocaleString("pt-BR")}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  LIMITE: R$81.000
                </span>
              </div>
            </div>

            {pctMEI >= 100 && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                  🚨 LIMITE ATINGIDO — Novas NFS-e bloqueadas. Considere migrar para ME.
                </p>
              </div>
            )}
            {pctMEI >= 90 && pctMEI < 100 && (
              <div className="mt-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                  ⚠️ 90% DO LIMITE — Avalie enquadramento como Microempresa (ME).
                </p>
              </div>
            )}
            {pctMEI >= 70 && pctMEI < 90 && (
              <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">
                  📊 70% DO LIMITE — Fique atento ao seu faturamento.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <LockedFeature
            title="ALERTA DE LIMITE MEI EM TEMPO REAL"
            desc="Monitoramento do faturamento MEI com alertas automáticos em 70%, 90% e 100% do limite anual."
            upgradeMsg={upgradeMessage("meiAlert")}
          />
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default HubFiscalPage;
