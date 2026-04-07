import { useState } from "react";
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePlanGate } from "@/hooks/usePlanGate";
import { PlanUpgradePrompt } from "@/components/chat/PlanUpgradePrompt";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/SEO";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { sendPushNotification } from "@/hooks/usePushNotifications";
import { useAuth as useProfile } from "@/hooks/useAuth";

interface QuoteItem {
  descricao: string;
  valor: number;
}

interface Quote {
  id: string;
  cliente_id: string;
  valor_total: number;
  status: "pendente" | "aprovado" | "recusado";
  validade: string | null;
  observacoes: string | null;
  itens_json: QuoteItem[];
  created_at: string;
  profiles?: { full_name: string };
}

const STATUS_CONFIG = {
  pendente: { label: "PENDENTE", color: "text-yellow-500", bg: "bg-yellow-500/10", icon: Clock },
  aprovado: { label: "APROVADO", color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
  recusado: { label: "RECUSADO", color: "text-destructive", bg: "bg-destructive/10", icon: XCircle },
};

const QuotesPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useProfile();
  const qc = useQueryClient();
  const { can, upgradeMessage } = usePlanGate();
  const canUse = can("quotes");
  const isProfessional = profile?.user_type === "professional";

  const [newQuote, setNewQuote] = useState({
    cliente_id: "",
    validade: "",
    observacoes: "",
    items: [{ descricao: "", valor: 0 }] as QuoteItem[],
  });
  const [showForm, setShowForm] = useState(false);

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["quotes", user?.id, isProfessional],
    queryFn: async () => {
      const field = isProfessional ? "profissional_id" : "cliente_id";
      const { data, error } = await supabase
        .from("quotes")
        .select("*, profiles!quotes_cliente_id_fkey(full_name)")
        .eq(field, user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
    enabled: !!user,
  });

  const totalQuote = newQuote.items.reduce((s, i) => s + Number(i.valor || 0), 0);

  const createQuote = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("quotes").insert({
        profissional_id: user!.id,
        cliente_id: newQuote.cliente_id,
        itens_json: newQuote.items.filter((i) => i.descricao.trim()),
        valor_total: totalQuote,
        validade: newQuote.validade || null,
        observacoes: newQuote.observacoes || null,
        status: "pendente",
      }).select().single();
      if (error) throw error;
      // Push ao cliente
      try {
        await sendPushNotification(newQuote.cliente_id, {
          title: "💰 Orçamento recebido",
          body: `${profile?.full_name ?? "Profissional"} enviou um orçamento de R$${totalQuote.toFixed(2)}`,
          type: "orcamento_enviado",
        });
      } catch { /* non-fatal */ }
      return data;
    },
    onSuccess: () => {
      toast.success("Orçamento enviado.");
      setShowForm(false);
      setNewQuote({ cliente_id: "", validade: "", observacoes: "", items: [{ descricao: "", valor: 0 }] });
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: () => toast.error("Erro ao enviar orçamento."),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, profissional_id }: { id: string; status: "aprovado" | "recusado"; profissional_id?: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
      if (status === "aprovado" && profissional_id) {
        try {
          await sendPushNotification(profissional_id, {
            title: "✅ Orçamento aprovado!",
            body: "O cliente aprovou seu orçamento.",
            type: "orcamento_aprovado",
          });
        } catch { /* non-fatal */ }
      }
    },
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Orçamentos | Fixr Elite" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground active:scale-95">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display font-black text-xs uppercase tracking-[0.2em] text-foreground">ORÇAMENTOS</h1>
              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mt-0.5">EXCLUSIVO ELITE</p>
            </div>
          </div>
          {canUse && isProfessional && (
            <button onClick={() => setShowForm(!showForm)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-yellow-500 text-black active:scale-95">
              <Plus size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {!canUse ? (
          <PlanUpgradePrompt message={upgradeMessage("quotes")} />
        ) : (
          <>
            {/* New quote form */}
            {showForm && isProfessional && (
              <div className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/5 p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground">NOVO ORÇAMENTO</p>
                <input
                  type="text"
                  placeholder="ID DO CLIENTE (user_id)"
                  value={newQuote.cliente_id}
                  onChange={(e) => setNewQuote((f) => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                />
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">ITENS</p>
                  {newQuote.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="DESCRIÇÃO"
                        value={item.descricao}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          items[idx].descricao = e.target.value;
                          setNewQuote((f) => ({ ...f, items }));
                        }}
                        className="flex-1 bg-background border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        placeholder="R$"
                        value={item.valor || ""}
                        onChange={(e) => {
                          const items = [...newQuote.items];
                          items[idx].valor = Number(e.target.value);
                          setNewQuote((f) => ({ ...f, items }));
                        }}
                        className="w-24 bg-background border-2 border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary"
                      />
                      {newQuote.items.length > 1 && (
                        <button onClick={() => setNewQuote((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="w-9 h-[42px] rounded-xl bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setNewQuote((f) => ({ ...f, items: [...f.items, { descricao: "", valor: 0 }] }))}
                    className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                    <Plus size={12} /> ADICIONAR ITEM
                  </button>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-border/40">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">TOTAL</span>
                  <span className="font-display font-black text-xl text-yellow-500">R${totalQuote.toFixed(2)}</span>
                </div>
                <input type="date" placeholder="VALIDADE"
                  value={newQuote.validade}
                  onChange={(e) => setNewQuote((f) => ({ ...f, validade: e.target.value }))}
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary"
                />
                <textarea
                  placeholder="OBSERVAÇÕES (OPCIONAL)"
                  value={newQuote.observacoes}
                  onChange={(e) => setNewQuote((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={2}
                  className="w-full bg-background border-2 border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary resize-none"
                />
                <button
                  onClick={() => createQuote.mutate()}
                  disabled={!newQuote.cliente_id.trim() || totalQuote === 0 || createQuote.isPending}
                  className="w-full py-4 rounded-xl bg-yellow-500 text-black font-display font-black text-xs uppercase tracking-[0.2em] disabled:opacity-40 active:scale-[0.98]"
                >
                  ENVIAR ORÇAMENTO
                </button>
              </div>
            )}

            {/* Quote list */}
            {quotes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">NENHUM ORÇAMENTO AINDA</p>
              </div>
            ) : (
              quotes.map((q) => {
                const cfg = STATUS_CONFIG[q.status];
                const Icon = cfg.icon;
                return (
                  <div key={q.id} className="rounded-2xl border-2 border-border bg-secondary/10 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${cfg.bg}`}>
                        <Icon size={12} className={cfg.color} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span className="font-display font-black text-xl text-foreground">R${Number(q.valor_total).toFixed(2)}</span>
                    </div>
                    {(q.itens_json as QuoteItem[]).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.descricao}</span>
                        <span>R${Number(item.valor).toFixed(2)}</span>
                      </div>
                    ))}
                    {q.validade && (
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        VÁLIDO ATÉ {new Date(q.validade).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {/* Client can approve/reject */}
                    {!isProfessional && q.status === "pendente" && (
                      <div className="flex gap-3 pt-2 border-t border-border/40">
                        <button onClick={() => updateStatus.mutate({ id: q.id, status: "aprovado" })}
                          className="flex-1 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 font-display font-black text-xs uppercase tracking-widest active:scale-95">
                          APROVAR
                        </button>
                        <button onClick={() => updateStatus.mutate({ id: q.id, status: "recusado" })}
                          className="flex-1 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive font-display font-black text-xs uppercase tracking-widest active:scale-95">
                          RECUSAR
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default QuotesPage;
