import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  nome: string;
  funcao: string;
  foto_url: string | null;
  ativo: boolean;
}

const TeamPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { can, upgradeMessage } = usePlanGate();
  const canUse = can("team");

  const [form, setForm] = useState({ nome: "", funcao: "" });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["team-members", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("profissional_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!user && canUse,
  });

  const activeCount = members.filter((m) => m.ativo).length;

  const addMember = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("team_members").insert({
        profissional_id: user!.id,
        nome: form.nome.trim(),
        funcao: form.funcao.trim(),
        ativo: true,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Colaborador adicionado.");
      setForm({ nome: "", funcao: "" });
      qc.invalidateQueries({ queryKey: ["team-members", user?.id] });
    },
    onError: (e: Error) => {
      if (e.message.includes("LIMITE_EQUIPE")) {
        toast.error("Máximo de 3 colaboradores atingido.");
      } else if (e.message.includes("PLANO_INSUFICIENTE")) {
        toast.error("Recurso exclusivo do plano Elite.");
      } else {
        toast.error("Erro ao adicionar colaborador.");
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_members").update({ ativo: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Colaborador removido.");
      qc.invalidateQueries({ queryKey: ["team-members", user?.id] });
    },
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Equipe | Fixr Elite" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">MINHA EQUIPE</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">EXCLUSIVO ELITE · {activeCount}/3 COLABORADORES</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!canUse ? (
          <PlanUpgradePrompt message={upgradeMessage("team")} />
        ) : (
          <>
            {activeCount < 3 && (
              <div className="rounded-2xl border-2 border-border bg-secondary/10 p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">ADICIONAR COLABORADOR</p>
                <input type="text" placeholder="NOME COMPLETO"
                  value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                />
                <input type="text" placeholder="FUNÇÃO (ex: AUXILIAR, PINTOR)"
                  value={form.funcao} onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                />
                <button
                  onClick={() => addMember.mutate()}
                  disabled={!form.nome.trim() || !form.funcao.trim() || addMember.isPending}
                  className="w-full py-4 rounded-xl bg-yellow-500 text-black font-display font-black text-xs uppercase tracking-[0.2em] disabled:opacity-40 active:scale-[0.98]"
                >
                  <Plus size={16} className="inline mr-2" />
                  ADICIONAR
                </button>
              </div>
            )}

            {members.filter((m) => m.ativo).length === 0 ? (
              <div className="text-center py-12">
                <Users size={32} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NENHUM COLABORADOR AINDA</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.filter((m) => m.ativo).map((m) => (
                  <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center font-display font-black text-lg text-yellow-500 uppercase flex-shrink-0">
                      {m.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-black text-xs uppercase tracking-widest text-foreground truncate">{m.nome.toUpperCase()}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{m.funcao.toUpperCase()}</p>
                    </div>
                    <button onClick={() => removeMember.mutate(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary/20 text-muted-foreground hover:text-destructive flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default TeamPage;
