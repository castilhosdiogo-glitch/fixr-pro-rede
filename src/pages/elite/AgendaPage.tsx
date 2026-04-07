import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Clock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

interface Schedule {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  disponivel: boolean;
  titulo: string | null;
  cliente_id: string | null;
}

const AgendaPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { can, upgradeMessage } = usePlanGate();
  const canUse = can("agenda");

  const [form, setForm] = useState({
    data: "",
    hora_inicio: "",
    hora_fim: "",
    titulo: "",
  });

  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ["schedules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("profissional_id", user!.id)
        .gte("data", new Date().toISOString().split("T")[0])
        .order("data", { ascending: true })
        .order("hora_inicio", { ascending: true });
      if (error) throw error;
      return data as Schedule[];
    },
    enabled: !!user && canUse,
  });

  const addSlot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("schedules").insert({
        profissional_id: user!.id,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        titulo: form.titulo || null,
        disponivel: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário adicionado.");
      setForm({ data: "", hora_inicio: "", hora_fim: "", titulo: "" });
      qc.invalidateQueries({ queryKey: ["schedules", user?.id] });
    },
    onError: () => toast.error("Erro ao adicionar horário."),
  });

  const removeSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário removido.");
      qc.invalidateQueries({ queryKey: ["schedules", user?.id] });
    },
  });

  const toggleDisponivel = useMutation({
    mutationFn: async ({ id, disponivel }: { id: string; disponivel: boolean }) => {
      const { error } = await supabase.from("schedules").update({ disponivel }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedules", user?.id] }),
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Agenda | Fixr Elite" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">AGENDA</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">EXCLUSIVO ELITE</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!canUse ? (
          <PlanUpgradePrompt message={upgradeMessage("agenda")} />
        ) : (
          <>
            {/* Add slot form */}
            <div className="rounded-2xl border-2 border-border bg-secondary/10 p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">ADICIONAR HORÁRIO DISPONÍVEL</p>
              <input
                type="date"
                value={form.data}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">INÍCIO</label>
                  <input type="time" value={form.hora_inicio} onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">FIM</label>
                  <input type="time" value={form.hora_fim} onChange={(e) => setForm((f) => ({ ...f, hora_fim: e.target.value }))}
                    className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary" />
                </div>
              </div>
              <input
                type="text"
                placeholder="DESCRIÇÃO OPCIONAL"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
              />
              <button
                onClick={() => addSlot.mutate()}
                disabled={!form.data || !form.hora_inicio || !form.hora_fim || addSlot.isPending}
                className="w-full py-4 rounded-xl bg-yellow-500 text-black font-display font-black text-xs uppercase tracking-[0.2em] disabled:opacity-40 active:scale-[0.98]"
              >
                <Plus size={16} className="inline mr-2" />
                ADICIONAR HORÁRIO
              </button>
            </div>

            {/* Schedule list */}
            {schedules.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={32} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NENHUM HORÁRIO CADASTRADO</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((s) => (
                  <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${s.disponivel ? "border-yellow-500/40 bg-yellow-500/5" : "border-border bg-secondary/10"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        {new Date(s.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                      </p>
                      <p className="text-xs font-black text-muted-foreground mt-0.5">
                        {s.hora_inicio.slice(0, 5)} – {s.hora_fim.slice(0, 5)}
                        {s.titulo && ` · ${s.titulo}`}
                      </p>
                      {s.cliente_id && (
                        <p className="text-[9px] font-black uppercase tracking-widest text-primary mt-1">AGENDADO POR CLIENTE</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleDisponivel.mutate({ id: s.id, disponivel: !s.disponivel })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.disponivel ? "bg-yellow-500/20 text-yellow-500" : "bg-secondary/20 text-muted-foreground"}`}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => removeSlot.mutate(s.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-secondary/20 text-muted-foreground hover:text-destructive"
                    >
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

export default AgendaPage;
