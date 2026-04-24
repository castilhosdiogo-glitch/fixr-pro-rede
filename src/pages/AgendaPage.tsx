import { useState } from "react";
import { ArrowLeft, Plus, Calendar, Clock, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanGate } from "@/hooks/usePlanGate";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

interface Schedule {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  start_at: string;
  end_at: string;
  status: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  pending: { text: "Pendente", color: "bg-warning/15 text-warning" },
  confirmed: { text: "Confirmado", color: "bg-primary/15 text-primary" },
  completed: { text: "Concluído", color: "bg-success/15 text-success" },
  cancelled: { text: "Cancelado", color: "bg-destructive/15 text-destructive" },
};

const AgendaPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planGate = usePlanGate();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

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

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["schedules", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("schedules")
        .select("*")
        .eq("profissional_id", profile!.id)
        .gte("start_at", new Date().toISOString().split("T")[0])
        .order("start_at", { ascending: true });
      return (data || []) as Schedule[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Perfil não encontrado");
      const { error } = await supabase.from("schedules").insert({
        profissional_id: profile.id,
        title,
        client_name: clientName || null,
        description: description || null,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setShowForm(false);
      setTitle("");
      setClientName("");
      setDescription("");
      setStartAt("");
      setEndAt("");
      toast.success("Agendamento criado!");
    },
    onError: () => toast.error("Erro ao criar agendamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Removido!");
    },
  });

  if (!planGate.isParceiro) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center p-6">
        <SEO title="Agenda | Fixr" />
        <div className="text-center space-y-4">
          <Calendar size={48} className="mx-auto text-muted-foreground" />
          <h2 className="font-display font-black text-sm uppercase tracking-[0.2em] text-foreground">
            AGENDA PROFISSIONAL
          </h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Gerencie seus compromissos. Exclusivo do plano Profissional.
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
      <SEO title="Agenda | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">AGENDA</h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {isLoading && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse py-10">
            CARREGANDO...
          </p>
        )}

        {!isLoading && schedules.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <Calendar size={32} className="mx-auto text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              NENHUM AGENDAMENTO
            </p>
          </div>
        )}

        {schedules.map((s) => {
          const label = STATUS_LABELS[s.status] || STATUS_LABELS.pending;
          return (
            <div key={s.id} className="p-4 rounded-2xl border-2 border-border bg-background space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-sm text-foreground">{s.title}</h3>
                  {s.client_name && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                      {s.client_name}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${label.color}`}>
                  {label.text}
                </span>
              </div>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {new Date(s.start_at).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(s.start_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {" — "}
                  {new Date(s.end_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="text-[9px] font-black uppercase tracking-widest text-destructive hover:underline flex items-center gap-1"
                >
                  <Trash2 size={10} /> REMOVER
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-end justify-center p-4">
          <div className="bg-background w-full max-w-lg rounded-t-3xl border-2 border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-[0.2em]">NOVO AGENDAMENTO</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do serviço"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional)"
              rows={2}
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">INÍCIO</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">FIM</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm mt-1"
                />
              </div>
            </div>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!title || !startAt || !endAt || createMutation.isPending}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest disabled:opacity-30"
            >
              {createMutation.isPending ? "SALVANDO..." : "CRIAR AGENDAMENTO"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default AgendaPage;
