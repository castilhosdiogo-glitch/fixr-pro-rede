import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  Settings,
  Users,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { MatchingConfigPanel } from "@/components/matching/MatchingConfigPanel";
import { KycAdminPanel } from "@/components/kyc/KycAdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSlotOccupancy,
  useUpdateSupplyLimit,
  SLOT_STATUS_CONFIG,
  SlotOccupancy,
} from "@/hooks/useSupplyControl";
import { useWaitingList, useNotifyWaitingList } from "@/hooks/useWaitingList";
import { SlotIndicator } from "@/components/supply/SlotIndicator";
import { AVAILABLE_CITIES } from "@/data/mock";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

// ─── Admin guard ─────────────────────────────────────────────

const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery<boolean>({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });
};

// ─── Slot Card ───────────────────────────────────────────────

interface SlotCardProps {
  slot: SlotOccupancy;
}

const SlotCard = ({ slot }: SlotCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draftMax, setDraftMax] = useState(String(slot.max_professionals));
  const [showQueue, setShowQueue] = useState(false);

  const { mutateAsync: updateLimit, isPending: saving } = useUpdateSupplyLimit();
  const { mutateAsync: notifyNext, isPending: notifying } = useNotifyWaitingList();
  const { data: queue = [] } = useWaitingList(slot.category_id, slot.city);

  const cfg = SLOT_STATUS_CONFIG[slot.status];

  const handleSave = async () => {
    const newMax = parseInt(draftMax, 10);
    if (isNaN(newMax) || newMax < 1) {
      toast.error("Limite deve ser maior que 0.");
      return;
    }
    try {
      await updateLimit({ id: slot.id, max_professionals: newMax });
      toast.success("Limite atualizado.");
      setEditing(false);
    } catch {
      toast.error("Erro ao atualizar limite.");
    }
  };

  const handleNotifyNext = async () => {
    try {
      await notifyNext({ categoryId: slot.category_id, city: slot.city });
      toast.success("Próxima pessoa da fila foi notificada.");
    } catch {
      toast.error("Erro ao notificar.");
    }
  };

  const pendingQueue = queue.filter((e) => !e.notified_at);
  const notifiedQueue = queue.filter((e) => !!e.notified_at);

  return (
    <div className={`rounded-2xl border ${cfg.borderColor} bg-card p-5 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display font-black text-sm uppercase tracking-widest text-foreground">
            {slot.category_name}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
            {slot.city}
          </p>
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Progress bar */}
      <SlotIndicator slot={slot} showDetails />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-secondary/20 p-2">
          <p className="font-display font-black text-lg text-foreground tabular-nums">
            {slot.active_professionals}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Ativos</p>
        </div>
        <div className="rounded-xl bg-secondary/20 p-2">
          <p className="font-display font-black text-lg text-foreground tabular-nums">
            {slot.available_slots}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Livres</p>
        </div>
        <div className="rounded-xl bg-secondary/20 p-2">
          <p className="font-display font-black text-lg text-foreground tabular-nums">
            {slot.waiting_count}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Na Fila</p>
        </div>
      </div>

      {/* Limit editor */}
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="number"
              min={1}
              max={999}
              value={draftMax}
              onChange={(e) => setDraftMax(e.target.value)}
              className="flex-1 bg-secondary/20 border border-primary rounded-xl px-3 py-2 text-sm font-bold text-foreground outline-none text-center tabular-nums"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 transition-all"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setEditing(false); setDraftMax(String(slot.max_professionals)); }}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary/20 border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/20 border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary transition-all"
          >
            <Settings size={13} />
            Limite: {slot.max_professionals}
          </button>
        )}

        {slot.waiting_count > 0 && (
          <button
            onClick={handleNotifyNext}
            disabled={notifying}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"
          >
            <RefreshCw size={12} className={notifying ? "animate-spin" : ""} />
            Notificar próximo
          </button>
        )}
      </div>

      {/* Waiting queue toggle */}
      {queue.length > 0 && (
        <div>
          <button
            onClick={() => setShowQueue((v) => !v)}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock size={12} />
            Ver fila ({queue.length})
            {showQueue ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showQueue && (
            <div className="mt-3 space-y-2 animate-in fade-in duration-200">
              {pendingQueue.length > 0 && (
                <>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                    Aguardando
                  </p>
                  {pendingQueue.map((entry, i) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl bg-secondary/10 border border-border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-muted-foreground tabular-nums w-5">
                          #{i + 1}
                        </span>
                        <div>
                          <p className="text-[10px] font-bold text-foreground">{entry.name}</p>
                          <p className="text-[9px] text-muted-foreground">{entry.phone}</p>
                        </div>
                      </div>
                      <p className="text-[8px] text-muted-foreground tabular-nums">
                        {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {notifiedQueue.length > 0 && (
                <>
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-3">
                    Notificados
                  </p>
                  {notifiedQueue.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl bg-green-500/5 border border-green-500/20 px-3 py-2 opacity-60"
                    >
                      <div>
                        <p className="text-[10px] font-bold text-foreground">{entry.name}</p>
                        <p className="text-[9px] text-muted-foreground">{entry.phone}</p>
                      </div>
                      <Check size={12} className="text-green-400" />
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: checkingRole } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<"supply" | "matching" | "kyc">("supply");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data: slots = [], isLoading, refetch, isFetching } = useSlotOccupancy();

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      const matchCity = cityFilter ? s.city === cityFilter : true;
      const matchCat = categoryFilter ? s.category_id === categoryFilter : true;
      return matchCity && matchCat;
    });
  }, [slots, cityFilter, categoryFilter]);

  // Aggregate summary stats
  const summary = useMemo(() => {
    const total = slots.length;
    const open = slots.filter((s) => s.status === "OPEN").length;
    const almostFull = slots.filter((s) => s.status === "ALMOST_FULL").length;
    const full = slots.filter((s) => s.status === "FULL").length;
    const totalWaiting = slots.reduce((acc, s) => acc + s.waiting_count, 0);
    return { total, open, almostFull, full, totalWaiting };
  }, [slots]);

  // Unique categories from loaded slots
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    slots.forEach((s) => seen.set(s.category_id, s.category_name));
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [slots]);

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Verificando Permissões...
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield size={40} className="text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Acesso Restrito
        </p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-widest rounded-2xl"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Painel Admin · Oferta | Fixr" description="Controle de vagas por categoria e cidade." />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-black text-xs uppercase tracking-[0.3em] text-foreground">
              Painel Admin
            </h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Controle de oferta · Motor de distribuição
            </p>
          </div>
          {activeTab === "supply" && (
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-secondary/20 border border-border text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 max-w-4xl mx-auto bg-secondary/10 rounded-2xl p-1 border border-border">
          <button
            onClick={() => setActiveTab("supply")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "supply"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users size={13} />
            Oferta
          </button>
          <button
            onClick={() => setActiveTab("matching")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "matching"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap size={13} />
            Distribuição
          </button>
          <button
            onClick={() => setActiveTab("kyc")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "kyc" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ShieldCheck size={13} />
            KYC
          </button>
        </div>
      </header>

      <div className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* ── Matching config tab ── */}
        {activeTab === "matching" && <MatchingConfigPanel />}

        {/* KYC tab */}
        {activeTab === "kyc" && <KycAdminPanel />}

        {/* ── Supply control tab ── */}
        {activeTab === "supply" && <>
        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Abertos", value: summary.open, color: "text-green-400" },
            { label: "Quase lotados", value: summary.almostFull, color: "text-yellow-400" },
            { label: "Lotados", value: summary.full, color: "text-red-400" },
            { label: "Na fila", value: summary.totalWaiting, color: "text-primary" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className={`font-display font-black text-2xl ${color} tabular-nums`}>{value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-secondary/10 border border-border rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground outline-none appearance-none cursor-pointer"
          >
            <option value="">Todas as cidades</option>
            {AVAILABLE_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-secondary/10 border border-border rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-foreground outline-none appearance-none cursor-pointer"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Slot count */}
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground pl-1">
          {filtered.length} de {summary.total} slots · por categoria e cidade
        </p>

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-20">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
              Carregando dados...
            </p>
          </div>
        )}

        {/* Grid of slot cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((slot) => (
              <SlotCard key={slot.id} slot={slot} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-2 text-center py-16 border border-dashed border-border rounded-2xl">
                <Users size={32} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Nenhum slot encontrado.
                </p>
              </div>
            )}
          </div>
        )}
        </> /* end supply tab */}
      </div>
    </div>
  );
};

export default AdminDashboard;

