import { useState } from "react";
import { ArrowLeft, Plus, DollarSign, X, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanGate } from "@/hooks/usePlanGate";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

const MEI_ANNUAL_LIMIT = 81000;

interface RevenueEntry {
  id: string;
  month: string;
  revenue: number;
  notes: string | null;
}

const MeiRevenuePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planGate = usePlanGate();
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState("");
  const [revenue, setRevenue] = useState("");
  const [notes, setNotes] = useState("");

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
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["meiRevenue", profile?.id, currentYear],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("mei_revenue_tracking")
        .select("*")
        .eq("professional_id", profile!.id)
        .gte("month", yearStart)
        .lte("month", yearEnd)
        .order("month", { ascending: true });
      return (data || []) as RevenueEntry[];
    },
  });

  const totalRevenue = entries.reduce((sum, e) => sum + e.revenue, 0);
  const percentage = Math.min((totalRevenue / MEI_ANNUAL_LIMIT) * 100, 100);
  const remaining = Math.max(MEI_ANNUAL_LIMIT - totalRevenue, 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Perfil não encontrado");
      const monthDate = `${month}-01`;
      const { error } = await supabase.from("mei_revenue_tracking").upsert(
        {
          professional_id: profile.id,
          month: monthDate,
          revenue: parseFloat(revenue) || 0,
          notes: notes || null,
        },
        { onConflict: "professional_id,month" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meiRevenue"] });
      setShowForm(false);
      setMonth("");
      setRevenue("");
      setNotes("");
      toast.success("Receita registrada!");
    },
    onError: () => toast.error("Erro ao registrar receita"),
  });

  if (!planGate.isParceiro) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center p-6">
        <SEO title="MEI Receitas | Fixr" />
        <div className="text-center space-y-4">
          <DollarSign size={48} className="mx-auto text-muted-foreground" />
          <h2 className="font-display font-black text-sm uppercase tracking-[0.2em]">CONTROLE MEI</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Acompanhe sua receita MEI e evite ultrapassar o limite. Exclusivo do plano Profissional.
          </p>
          <button
            onClick={() => navigate("/planos")}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest"
          >
            SER PROFISSIONAL
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="MEI Receitas | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">MEI RECEITAS</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Annual summary card */}
        <div className="p-5 rounded-2xl border-2 border-border bg-background space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              LIMITE ANUAL MEI {currentYear}
            </p>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-black text-2xl text-foreground">
                R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                de R$ {MEI_ANNUAL_LIMIT.toLocaleString("pt-BR")}
              </p>
            </div>
            <p className={`font-black text-lg ${percentage >= 90 ? "text-destructive" : percentage >= 70 ? "text-warning" : "text-primary"}`}>
              {percentage.toFixed(1)}%
            </p>
          </div>
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                percentage >= 90 ? "bg-destructive" : percentage >= 70 ? "bg-warning" : "bg-primary"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            RESTANTE: R$ {remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>

          {percentage >= 90 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle size={14} className="text-destructive flex-shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
                ATENÇÃO: PRÓXIMO DO LIMITE MEI!
              </p>
            </div>
          )}
        </div>

        {/* Monthly entries */}
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">MESES</p>

        {isLoading && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse py-6">
            CARREGANDO...
          </p>
        )}

        {!isLoading && entries.length === 0 && (
          <div className="text-center py-6 space-y-2">
            <DollarSign size={24} className="mx-auto text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              NENHUMA RECEITA REGISTRADA
            </p>
          </div>
        )}

        {entries.map((e) => {
          const d = new Date(e.month + "T12:00:00");
          const monthName = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
          return (
            <div key={e.id} className="p-4 rounded-2xl border-2 border-border bg-background flex items-center justify-between">
              <div>
                <p className="font-black text-sm text-foreground capitalize">{monthName}</p>
                {e.notes && <p className="text-[10px] text-muted-foreground mt-1">{e.notes}</p>}
              </div>
              <p className="font-black text-primary">
                R$ {e.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4">
          <div className="bg-background w-full max-w-lg rounded-t-3xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-[0.2em]">REGISTRAR RECEITA</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">MÊS</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">RECEITA (R$)</label>
              <input
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
                placeholder="0,00"
                step="0.01"
                className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm mt-1"
              />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações (opcional)"
              rows={2}
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm resize-none"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={!month || !revenue || createMutation.isPending}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest disabled:opacity-30"
            >
              {createMutation.isPending ? "SALVANDO..." : "REGISTRAR"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MeiRevenuePage;
