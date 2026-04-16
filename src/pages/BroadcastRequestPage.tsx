import { useState, useEffect } from "react";
import { ArrowLeft, Send, Zap, CheckCircle, MapPin, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { AVAILABLE_CITIES } from "@/data/mock";
import { useCreateBroadcastRequest } from "@/hooks/useMatchingEngine";
import { DispatchStatusBadge } from "@/components/matching/DispatchStatusBadge";
import { SEO } from "@/components/SEO";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

type Urgencia = "hoje" | "semana" | "sem_pressa";
const URGENCIA_OPTS: { value: Urgencia; label: string; hint: string }[] = [
  { value: "hoje", label: "Hoje", hint: "Urgente, o quanto antes" },
  { value: "semana", label: "Esta semana", hint: "Sem pressa imediata" },
  { value: "sem_pressa", label: "Sem pressa", hint: "Posso esperar o melhor pro" },
];

/**
 * BroadcastRequestPage — /solicitar
 *
 * Client flow:
 * 1. Select category + city + describe the job
 * 2. Submit → matching engine dispatches to top 3-5 professionals
 * 3. Page polls for status and shows real-time updates
 * 4. When a professional accepts → client is notified
 */
const BroadcastRequestPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPro = searchParams.get("pro") ?? "";
  const preselectedCat = searchParams.get("cat") ?? "";

  const { profile, loading } = useAuth();
  const { data: categories = [] } = useCategories();
  const { mutateAsync: createRequest, isPending } = useCreateBroadcastRequest();

  const [form, setForm] = useState({
    categoryId: preselectedCat,
    city: AVAILABLE_CITIES[0],
    description: "",
    endereco: "",
    urgencia: "semana" as Urgencia,
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill category: use query param first, then first available
  useEffect(() => {
    if (categories.length > 0 && !form.categoryId) {
      const match = preselectedCat
        ? categories.find((c) => c.id === preselectedCat)
        : null;
      setForm((prev) => ({
        ...prev,
        categoryId: match ? match.id : categories[0].id,
      }));
    }

  }, [categories, preselectedCat, form.categoryId]);

  // Pre-fill city + endereço from profile
  useEffect(() => {
    if (!profile) return;
    const p = profile as typeof profile & {
      endereco_principal?: string | null;
      endereco_lat?: number | null;
      endereco_lng?: number | null;
    };
    setForm((prev) => ({
      ...prev,
      city: p.city ?? prev.city,
      endereco: p.endereco_principal ?? prev.endereco,
    }));
    if (p.endereco_lat != null && p.endereco_lng != null) {
      setCoords({ lat: Number(p.endereco_lat), lng: Number(p.endereco_lng) });
    }
  }, [profile]);

  const captureCoords = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização não suportada");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoLoading(false);
        toast.success("Localização capturada");
      },
      (err) => {
        setGeoLoading(false);
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Permissão negada"
            : "Não foi possível obter localização",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.city || !form.description.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (form.description.trim().length < 10) {
      toast.error("Descreva o serviço com pelo menos 10 caracteres.");
      return;
    }
    try {
      const result = await createRequest({
        category_id: form.categoryId,
        city: form.city,
        description: form.description.trim(),
        endereco: form.endereco.trim() || undefined,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        urgencia: form.urgencia,
      });
      setBroadcastId(result.id);
      setSubmitted(true);
      toast.success("Solicitação enviada! Buscando profissionais...");
    } catch {
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Carregando...
        </p>
      </div>
    );
  }

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title="Solicitar Serviço | Fixr"
        description="Descreva o serviço que você precisa e receba propostas dos melhores profissionais da sua região."
      />

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
              Solicitar Especialista
            </h1>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
              Motor de Distribuição Inteligente
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-primary/10 border border-primary/30">
            <Zap size={12} className="text-primary" />
            <span className="text-[8px] font-black uppercase tracking-widest text-primary">Smart</span>
          </div>
        </div>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* How it works */}
        {!submitted && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Como funciona
            </p>
            {[
              "Descreva o que você precisa",
              "O sistema seleciona os 3–5 melhores profissionais da região",
              "Eles têm 5 minutos para aceitar",
              "O primeiro a aceitar cuida do seu serviço",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-[10px] font-medium text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        )}

        {/* Pre-selected professional banner */}
        {!submitted && preselectedPro && (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
            <Zap size={14} className="text-primary flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-widest text-primary">
              Solicitação direcionada ao profissional selecionado
            </p>
          </div>
        )}

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Tipo de serviço
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
                required
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-base font-medium text-foreground focus:border-primary outline-none appearance-none cursor-pointer uppercase tracking-wider"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-background">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Sua cidade
              </label>
              <select
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                required
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-base font-medium text-foreground focus:border-primary outline-none appearance-none cursor-pointer uppercase tracking-wider"
              >
                {AVAILABLE_CITIES.map((city) => (
                  <option key={city} value={city} className="bg-background">
                    {city.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Descreva o serviço
              </label>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                required
                rows={4}
                minLength={10}
                maxLength={500}
                placeholder="EX: PRECISO TROCAR UMA TORNEIRA NA COZINHA E CONSERTAR UM CANO QUE ESTÁ PINGANDO..."
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-sm font-medium text-foreground focus:border-primary placeholder:text-muted-foreground/30 outline-none resize-none uppercase tracking-wide"
              />
              <p className="text-[8px] font-bold text-muted-foreground text-right tabular-nums">
                {form.description.length}/500
              </p>
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Endereço do serviço
              </label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => update("endereco", e.target.value)}
                placeholder="Rua, número, bairro"
                className="w-full bg-secondary/20 border border-border rounded-2xl px-4 py-4 text-sm font-medium text-foreground focus:border-primary placeholder:text-muted-foreground/30 outline-none"
              />
              <button
                type="button"
                onClick={captureCoords}
                disabled={geoLoading}
                className="w-full mt-2 rounded-xl border border-border bg-secondary/10 px-3 py-2.5 flex items-center gap-2 hover:border-primary/60 transition-all disabled:opacity-50"
              >
                {geoLoading ? (
                  <Loader2 size={12} className="animate-spin text-primary flex-shrink-0" />
                ) : (
                  <MapPin size={12} className={`${coords ? "text-emerald-500" : "text-primary"} flex-shrink-0`} />
                )}
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground">
                  {coords
                    ? `Localização pronta (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`
                    : "Usar minha localização atual"}
                </span>
              </button>
            </div>

            {/* Urgência */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                Urgência
              </label>
              <div className="grid grid-cols-3 gap-2">
                {URGENCIA_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update("urgencia", opt.value)}
                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${
                      form.urgencia === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/10 hover:border-primary/60"
                    }`}
                  >
                    <p className={`text-[9px] font-black uppercase tracking-widest ${
                      form.urgencia === opt.value ? "text-primary" : "text-foreground"
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-[8px] font-medium text-muted-foreground mt-1 leading-tight">
                      {opt.hint}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !form.description.trim() || !form.categoryId}
              className="w-full py-5 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Send size={16} />
              {isPending ? "Enviando..." : "Solicitar Especialista Agora"}
            </button>
          </form>
        ) : (
          /* ── Post-submit: status tracking ── */
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Request summary */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-green-400">
                  Solicitação criada
                </p>
              </div>
              <p className="text-sm font-bold text-foreground uppercase tracking-tight">
                {form.description}
              </p>
              <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground">
                <span>{selectedCategory?.name ?? form.categoryId}</span>
                <span>·</span>
                <span>{form.city}</span>
              </div>
            </div>

            {/* Live status */}
            {broadcastId && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground pl-1">
                  Status da distribuição
                </p>
                <DispatchStatusBadge broadcastId={broadcastId} showBreakdown />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => { setSubmitted(false); setBroadcastId(null); setForm({ ...form, description: "" }); }}
                className="w-full py-4 border-2 border-border text-foreground font-display font-black text-xs uppercase tracking-widest rounded-2xl hover:border-primary hover:text-primary transition-all"
              >
                Nova Solicitação
              </button>
              <button
                onClick={() => navigate("/meu-painel")}
                className="w-full py-4 bg-secondary/20 border border-border text-muted-foreground font-display font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-secondary/40 transition-all"
              >
                Ver Meu Painel
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default BroadcastRequestPage;

