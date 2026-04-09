import { ArrowLeft, FileText, Receipt, TrendingUp, Lock, ExternalLink, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanGate } from "@/hooks/usePlanGate";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";

const MEI_ANNUAL_LIMIT = 81000;

const HubFiscalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const planGate = usePlanGate();

  const { data: profile } = useQuery({
    queryKey: ["myProfile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("professional_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
  });

  const currentYear = new Date().getFullYear();

  const { data: meiTotal = 0 } = useQuery({
    queryKey: ["meiTotal", profile?.id, currentYear],
    enabled: !!profile?.id && planGate.isParceiro,
    queryFn: async () => {
      const { data } = await supabase
        .from("mei_revenue_tracking")
        .select("revenue")
        .eq("professional_id", profile!.id)
        .gte("month", `${currentYear}-01-01`)
        .lte("month", `${currentYear}-12-31`);
      return (data || []).reduce((sum: number, r: { revenue: number }) => sum + r.revenue, 0);
    },
  });

  const meiPercentage = Math.min((meiTotal / MEI_ANNUAL_LIMIT) * 100, 100);

  const Section = ({ title, locked, children }: { title: string; locked: boolean; children: React.ReactNode }) => (
    <div className={`p-5 rounded-2xl border-2 ${locked ? "border-border/50 opacity-60" : "border-border"} bg-background space-y-3`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        {locked && <Lock size={12} className="text-muted-foreground" />}
      </div>
      {locked ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Disponível a partir do plano Parceiro.</p>
          <button
            onClick={() => navigate("/planos")}
            className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            FAZER UPGRADE
          </button>
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Hub Fiscal | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">HUB FISCAL</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* NFS-e Section — Parceiro+ */}
        <Section title="NOTA FISCAL DE SERVIÇO (NFS-e)" locked={!planGate.isParceiro}>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/10">
              <FileText size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Emissão de NFS-e</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Para emitir NFS-e, acesse o portal da sua prefeitura. A maioria oferece sistema online gratuito.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">LINKS ÚTEIS</p>
              <a
                href="https://www.nfse.gov.br/EmissorNacional"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink size={12} /> Emissor Nacional NFS-e
              </a>
              <a
                href="https://www8.receita.fazenda.gov.br/SimplesNacional/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary hover:underline"
              >
                <ExternalLink size={12} /> Portal Simples Nacional
              </a>
            </div>
          </div>
        </Section>

        {/* DAS Section — Parceiro+ */}
        <Section title="GUIA DAS MENSAL" locked={!planGate.isParceiro}>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/10">
              <Receipt size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Pagamento do DAS</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  O DAS (Documento de Arrecadação do Simples Nacional) deve ser pago até o dia 20 de cada mês.
                </p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2">
              <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-warning">LEMBRETE</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Valor atual do DAS MEI: R$ 75,90 (comércio/indústria) ou R$ 80,90 (serviços). Vencimento dia 20.
                </p>
              </div>
            </div>
            <a
              href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} /> Gerar Guia DAS — PGMEI
            </a>
          </div>
        </Section>

        {/* MEI Limit Monitoring — Parceiro */}
        <Section title="MONITORAMENTO LIMITE MEI" locked={!planGate.isParceiro}>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/10">
              <TrendingUp size={16} className="text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">Receita Acumulada {currentYear}</p>
                    <p className="font-black text-lg text-foreground mt-1">
                      R$ {meiTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <p className={`font-black text-sm ${meiPercentage >= 90 ? "text-destructive" : meiPercentage >= 70 ? "text-warning" : "text-primary"}`}>
                    {meiPercentage.toFixed(1)}%
                  </p>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      meiPercentage >= 90 ? "bg-destructive" : meiPercentage >= 70 ? "bg-warning" : "bg-primary"
                    }`}
                    style={{ width: `${meiPercentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Limite: R$ {MEI_ANNUAL_LIMIT.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/mei-receitas")}
              className="w-full py-3 rounded-xl bg-primary/10 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-colors"
            >
              GERENCIAR RECEITAS MEI
            </button>
          </div>
        </Section>

        {/* General fiscal tips */}
        <div className="p-5 rounded-2xl border-2 border-border bg-background space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">DICAS FISCAIS</p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-black">1.</span>
              Mantenha todas as notas fiscais emitidas organizadas por mês
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-black">2.</span>
              Pague o DAS em dia para evitar multas e juros
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-black">3.</span>
              Faça a Declaração Anual do MEI (DASN-SIMEI) até 31 de maio
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-black">4.</span>
              Acompanhe sua receita mensal para não ultrapassar o limite de R$ 81.000/ano
            </li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HubFiscalPage;
