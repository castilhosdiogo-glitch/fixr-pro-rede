import { useState } from "react";
import { ArrowLeft, Plus, FileText, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanGate } from "@/hooks/usePlanGate";
import BottomNav from "@/components/BottomNav";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";

interface Quote {
  id: string;
  client_name: string;
  client_phone: string | null;
  description: string | null;
  total: number;
  status: string;
  valid_until: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  draft: { text: "Rascunho", color: "bg-muted text-muted-foreground" },
  sent: { text: "Enviado", color: "bg-primary/15 text-primary" },
  accepted: { text: "Aceito", color: "bg-success/15 text-success" },
  rejected: { text: "Rejeitado", color: "bg-destructive/15 text-destructive" },
};

const QuotesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const planGate = usePlanGate();
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<{ desc: string; qty: string; price: string }[]>([
    { desc: "", qty: "1", price: "" },
  ]);

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

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*")
        .eq("profissional_id", profile!.id)
        .order("created_at", { ascending: false });
      return (data || []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        client_name: (q.client_name as string) || "",
        client_phone: (q.client_phone as string) || null,
        description: (q.description as string) || null,
        total: Number(q.total || q.valor_total || 0),
        status: (q.status as string) || "draft",
        valid_until: (q.validade as string) || null,
        created_at: q.created_at as string,
      })) as Quote[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Perfil não encontrado");
      const total = items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0);

      const { data: quote, error } = await supabase
        .from("quotes")
        .insert({
          profissional_id: profile.id,
          client_name: clientName,
          client_phone: clientPhone || null,
          description: description || null,
          total,
          valor_total: total,
        })
        .select("id")
        .single();

      if (error) throw error;

      const quoteItems = items
        .filter((i) => i.desc && i.price)
        .map((i) => ({
          quote_id: quote.id,
          description: i.desc,
          quantity: parseFloat(i.qty) || 1,
          unit_price: parseFloat(i.price) || 0,
        }));

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase.from("quote_items").insert(quoteItems);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      setShowForm(false);
      setClientName("");
      setClientPhone("");
      setDescription("");
      setItems([{ desc: "", qty: "1", price: "" }]);
      toast.success("Orçamento criado!");
    },
    onError: () => toast.error("Erro ao criar orçamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Removido!");
    },
  });

  if (!planGate.isParceiro) {
    return (
      <div className="min-h-screen pb-20 bg-background flex items-center justify-center p-6">
        <SEO title="Orçamentos | Fixr" />
        <div className="text-center space-y-4">
          <FileText size={48} className="mx-auto text-muted-foreground" />
          <h2 className="font-display font-black text-sm uppercase tracking-[0.2em]">ORÇAMENTOS</h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Crie e gerencie orçamentos profissionais. Exclusivo do plano Profissional.
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

  const addItem = () => setItems([...items, { desc: "", qty: "1", price: "" }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) =>
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  const calcTotal = () => items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.price) || 0), 0);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <SEO title="Orçamentos | Fixr" />

      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-display font-black text-xs uppercase tracking-[0.2em]">ORÇAMENTOS</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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

        {!isLoading && quotes.length === 0 && (
          <div className="text-center py-10 space-y-2">
            <FileText size={32} className="mx-auto text-muted-foreground" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              NENHUM ORÇAMENTO
            </p>
          </div>
        )}

        {quotes.map((q) => {
          const label = STATUS_LABELS[q.status] || STATUS_LABELS.draft;
          return (
            <div key={q.id} className="p-4 rounded-2xl border-2 border-border bg-background space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-sm text-foreground">{q.client_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                    {new Date(q.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${label.color}`}>
                  {label.text}
                </span>
              </div>
              {q.description && <p className="text-xs text-muted-foreground">{q.description}</p>}
              <p className="font-black text-lg text-primary">
                R$ {q.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => deleteMutation.mutate(q.id)}
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
          <div className="bg-background w-full max-w-lg rounded-t-3xl border-2 border-border p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-[0.2em]">NOVO ORÇAMENTO</h2>
              <button onClick={() => setShowForm(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Telefone (opcional)"
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do serviço"
              rows={2}
              className="w-full bg-secondary/10 border-2 border-border rounded-2xl px-4 py-3 text-sm resize-none"
            />

            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">ITENS</p>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={item.desc}
                    onChange={(e) => updateItem(i, "desc", e.target.value)}
                    placeholder="Descrição"
                    className="flex-1 bg-secondary/10 border-2 border-border rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    value={item.qty}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    placeholder="Qtd"
                    type="number"
                    className="w-16 bg-secondary/10 border-2 border-border rounded-xl px-3 py-2 text-sm text-center"
                  />
                  <input
                    value={item.price}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    placeholder="R$"
                    type="number"
                    className="w-24 bg-secondary/10 border-2 border-border rounded-xl px-3 py-2 text-sm text-right"
                  />
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)} className="text-destructive">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addItem}
                className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
              >
                + ADICIONAR ITEM
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">TOTAL</p>
              <p className="font-black text-lg text-primary">
                R$ {calcTotal().toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <button
              onClick={() => createMutation.mutate()}
              disabled={!clientName || items.every((i) => !i.desc) || createMutation.isPending}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest disabled:opacity-30"
            >
              {createMutation.isPending ? "SALVANDO..." : "CRIAR ORÇAMENTO"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default QuotesPage;
