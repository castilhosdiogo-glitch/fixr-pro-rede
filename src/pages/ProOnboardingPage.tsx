import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles, ArrowRight, ArrowLeft, Hammer, Camera, FileText,
  Landmark, CheckCircle2, Upload, MapPin, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { isValidCNPJ, formatCNPJ } from "@/schemas/mei-validation";
import {
  useOnboardingState,
  useSetProOnboardingStep,
  useCompleteProOnboarding,
} from "@/hooks/useOnboarding";
import { KycUploadForm } from "@/components/kyc/KycUploadForm";

const TOTAL = 7;

export default function ProOnboardingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: state, isLoading } = useOnboardingState();
  const setStep = useSetProOnboardingStep();
  const complete = useCompleteProOnboarding();
  const [step, setLocalStep] = useState(1);

  useEffect(() => {
    if (!isLoading && state) {
      if (state.user_type !== "professional") {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (state.completo) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setLocalStep(state.passo_atual ?? 1);
    }
  }, [state, isLoading, navigate]);

  const go = async (next: number) => {
    setLocalStep(next);
    try {
      await setStep.mutateAsync(next);
    } catch (e) {
      console.error("setStep", e);
    }
  };

  const finish = async () => {
    try {
      await complete.mutateAsync();
      toast.success("Onboarding concluído! Você já pode receber pedidos.");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error("Não foi possível finalizar. Tente novamente.");
      console.error(e);
    }
  };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-background animate-pulse" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <ProgressBar step={step} />
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
          {step === 1 && <StepWelcome name={profile?.full_name ?? ""} onNext={() => go(2)} />}
          {step === 2 && (
            <StepCategories
              userId={user.id}
              onBack={() => go(1)}
              onNext={() => go(3)}
            />
          )}
          {step === 3 && (
            <StepLocation userId={user.id} onBack={() => go(2)} onNext={() => go(4)} />
          )}
          {step === 4 && (
            <StepPhoto
              userId={user.id}
              current={profile?.avatar_url ?? null}
              onBack={() => go(3)}
              onNext={() => go(5)}
            />
          )}
          {step === 5 && (
            <StepBio userId={user.id} onBack={() => go(4)} onNext={() => go(6)} />
          )}
          {step === 6 && (
            <StepKyc onBack={() => go(5)} onNext={() => go(7)} />
          )}
          {step === 7 && (
            <StepBank
              onBack={() => go(6)}
              onFinish={finish}
              finishing={complete.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Progress bar ───────────── */

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / TOTAL) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
          Passo {step} de {TOTAL}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ───────────── Step 1: Welcome ───────────── */

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  const firstName = name?.split(" ")[0] || "";
  return (
    <div className="text-center space-y-5">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="text-primary" size={24} />
      </div>
      <div>
        <h1 className="text-2xl font-display font-black tracking-tight">
          Bem-vindo{firstName ? `, ${firstName}` : ""} à Fixr!
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Vamos configurar seu perfil em 6 passos rápidos. Leva ~5 minutos e é
          necessário para começar a receber pedidos.
        </p>
      </div>
      <PrimaryButton onClick={onNext}>
        Começar <ArrowRight size={14} />
      </PrimaryButton>
    </div>
  );
}

/* ───────────── Step 2: Categories (multi-select) ───────────── */

function StepCategories({
  userId, onBack, onNext,
}: { userId: string; onBack: () => void; onNext: () => void }) {
  const { data: categories = [], isLoading } = useCategories();
  const [primary, setPrimary] = useState<string | null>(null);
  const [extras, setExtras] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("professional_profiles")
        .select("category_id, categorias")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setPrimary(data.category_id ?? null);
        const c = data.categorias as string[] | null;
        setExtras(Array.isArray(c) ? c.filter((x: string) => x !== data.category_id) : []);
      }
    })();
  }, [userId]);

  const toggleExtra = (id: string) => {
    setExtras((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const save = async () => {
    if (!primary) { toast.error("Escolha sua categoria principal."); return; }
    setSaving(true);
    const cats = Array.from(new Set([primary, ...extras]));
    const primaryCat = categories.find((c) => c.id === primary);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("professional_profiles")
      .upsert(
        {
          user_id: userId,
          category_id: primary,
          category_name: primaryCat?.name ?? primary,
          categorias: cats,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) { toast.error("Erro ao salvar categorias."); console.error(error); return; }
    onNext();
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={Hammer} title="Suas categorias" subtitle="Escolha a principal e até 3 extras." />
      {isLoading ? (
        <div className="h-40 animate-pulse bg-muted rounded-xl" />
      ) : (
        <>
          <Label>Categoria principal</Label>
          <select
            value={primary ?? ""}
            onChange={(e) => setPrimary(e.target.value || null)}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium"
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Label>Categorias extras (opcional)</Label>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.id !== primary)
              .map((c) => {
                const on = extras.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleExtra(c.id)}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/50",
                    ].join(" ")}
                  >
                    {c.name}
                  </button>
                );
              })}
          </div>
        </>
      )}
      <StepNav onBack={onBack} onNext={save} loading={saving} disabled={!primary} />
    </div>
  );
}

/* ───────────── Step 3: Location (GPS obrigatório) ───────────── */

function StepLocation({
  userId, onBack, onNext,
}: { userId: string; onBack: () => void; onNext: () => void }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("professional_profiles")
        .select("latitude, longitude")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.latitude != null && data?.longitude != null) {
        setCoords({ lat: data.latitude, lng: data.longitude });
      }
    })();
  }, [userId]);

  const capture = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Geolocalização não suportada no navegador.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);

    const onSuccess = (pos: GeolocationPosition) => {
      setCoords({
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      });
      setGeoLoading(false);
    };

    const onHighFail = (err: GeolocationPositionError) => {
      setGeoLoading(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGeoError("Permissão negada — libere a localização nas configurações do navegador.");
      } else if (err.code === err.TIMEOUT) {
        setGeoError("Tempo esgotado — ative o GPS e tente de novo em local aberto.");
      } else {
        setGeoError("Localização indisponível — verifique se o GPS está ativado.");
      }
    };

    const onLowFail = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setGeoLoading(false);
        setGeoError("Permissão negada — libere a localização nas configurações do navegador.");
        return;
      }
      navigator.geolocation.getCurrentPosition(onSuccess, onHighFail, {
        enableHighAccuracy: true, timeout: 20_000, maximumAge: 0,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onLowFail, {
      enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000,
    });
  };

  const save = async () => {
    if (!coords) { toast.error("Defina sua localização para continuar."); return; }
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("professional_profiles")
      .update({ latitude: coords.lat, longitude: coords.lng })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar localização."); console.error(error); return; }
    onNext();
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={MapPin} title="Sua localização" subtitle="Usada para te enviar pedidos dentro do seu raio de atendimento." />

      {coords ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">Localização definida</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={geoLoading}
            className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50"
          >
            {geoLoading ? <Loader2 size={14} className="animate-spin" /> : "Atualizar"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={capture}
          disabled={geoLoading}
          className="w-full rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-center gap-3 hover:border-primary hover:bg-primary/10 transition disabled:opacity-50"
        >
          {geoLoading ? (
            <Loader2 size={16} className="animate-spin text-primary shrink-0" />
          ) : (
            <MapPin size={16} className="text-primary shrink-0" />
          )}
          <div className="text-left">
            <p className="text-sm font-bold text-primary">
              {geoLoading ? "Obtendo localização..." : "Definir minha localização"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Obrigatório para receber pedidos próximos a você.
            </p>
          </div>
        </button>
      )}

      {geoError && (
        <p className="text-xs text-red-500">{geoError}</p>
      )}

      <StepNav onBack={onBack} onNext={save} loading={saving} disabled={!coords} />
    </div>
  );
}

/* ───────────── Step 3: Photo ───────────── */

function StepPhoto({
  userId, current, onBack, onNext,
}: { userId: string; current: string | null; onBack: () => void; onNext: () => void }) {
  const [preview, setPreview] = useState<string | null>(current);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande (máx 5MB)."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file && current) { onNext(); return; }
    if (!file) { toast.error("Escolha uma foto."); return; }
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);
      if (updErr) throw updErr;
      onNext();
    } catch (e) {
      toast.error("Falha ao enviar foto.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <StepHeader icon={Camera} title="Foto de perfil" subtitle="Clientes confiam mais em pros com foto clara." />
      <label className="block">
        <div className="w-32 h-32 rounded-full mx-auto bg-muted border-2 border-dashed border-border overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/50 transition">
          {preview ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <Upload size={24} className="text-muted-foreground" />
          )}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-center text-muted-foreground mt-2">Clique para selecionar (máx 5MB)</p>
      </label>
      <StepNav onBack={onBack} onNext={save} loading={saving} disabled={!preview} />
    </div>
  );
}

/* ───────────── Step 4: Bio + especialidades ───────────── */

function StepBio({
  userId, onBack, onNext,
}: { userId: string; onBack: () => void; onNext: () => void }) {
  const [bio, setBio] = useState("");
  const [esp, setEsp] = useState("");
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf");
  const [cnpj, setCnpj] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("professional_profiles")
        .select("description, especialidades, tipo_pessoa, cnpj")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) {
        setBio(data.description ?? "");
        const e = data.especialidades as string[] | null;
        setEsp(Array.isArray(e) ? e.join(", ") : "");
        if (data.tipo_pessoa === "pj") setTipoPessoa("pj");
        if (data.cnpj) setCnpj(formatCNPJ(data.cnpj));
      }
    })();
  }, [userId]);

  const cnpjDigits = cnpj.replace(/\D/g, "");
  const cnpjValid = tipoPessoa === "pf" || isValidCNPJ(cnpjDigits);

  const save = async () => {
    if (bio.trim().length < 20) { toast.error("Escreva pelo menos 20 caracteres na bio."); return; }
    if (tipoPessoa === "pj" && !isValidCNPJ(cnpjDigits)) { toast.error("CNPJ inválido."); return; }
    setSaving(true);
    const especialidades = esp.split(",").map((s) => s.trim()).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("professional_profiles")
      .update({
        description: bio.trim(),
        especialidades,
        tipo_pessoa: tipoPessoa,
        cnpj: tipoPessoa === "pj" ? cnpjDigits : null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar."); console.error(error); return; }
    onNext();
  };

  const count = bio.trim().length;
  const disabled = count < 20 || !cnpjValid;

  return (
    <div className="space-y-5">
      <StepHeader icon={FileText} title="Sobre você" subtitle="Conte sua experiência e o que você faz melhor." />
      <div>
        <Label>Bio <span className="text-muted-foreground">({count}/20+)</span></Label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={5}
          placeholder="Ex: Eletricista há 8 anos, atendo residências e comércio. Especialidade em instalações de ar-condicionado."
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
        />
      </div>
      <div>
        <Label>Especialidades (separadas por vírgula)</Label>
        <input
          type="text"
          value={esp}
          onChange={(e) => setEsp(e.target.value)}
          placeholder="aquecedor a gás, quadro de luz, ar-condicionado"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
        />
      </div>
      <div>
        <Label>Tipo de pessoa</Label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: "pf", label: "Autônomo (PF)" },
            { value: "pj", label: "Pessoa Jurídica" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoPessoa(opt.value)}
              className={[
                "rounded-xl border px-3 py-2.5 text-xs font-bold transition",
                tipoPessoa === opt.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:border-primary/50",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {tipoPessoa === "pj" && (
        <div>
          <Label>CNPJ</Label>
          <input
            type="text"
            value={cnpj}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
              setCnpj(digits.length === 14 ? formatCNPJ(digits) : digits);
            }}
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
          />
          {cnpjDigits.length === 14 && !isValidCNPJ(cnpjDigits) && (
            <p className="text-[11px] text-red-500 mt-1">CNPJ inválido.</p>
          )}
        </div>
      )}
      <StepNav onBack={onBack} onNext={save} loading={saving} disabled={disabled} />
    </div>
  );
}

/* ───────────── Step 5: KYC ───────────── */

function StepKyc({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="space-y-5">
      <StepHeader icon={FileText} title="Verificação de identidade" subtitle="Obrigatório para receber pedidos. Análise em até 24h." />
      <KycUploadForm />
      <StepNav onBack={onBack} onNext={onNext} />
      <p className="text-[10px] text-muted-foreground text-center">
        Você pode avançar enquanto aguardamos a análise — seu perfil só aparece em buscas após aprovado.
      </p>
    </div>
  );
}

/* ───────────── Step 6: Bank (Pagar.me recipient) ───────────── */

type BankForm = {
  holder_name: string;
  holder_document: string;
  bank_code: string;
  branch_number: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
};

function StepBank({
  onBack, onFinish, finishing,
}: { onBack: () => void; onFinish: () => void; finishing: boolean }) {
  const [form, setForm] = useState<BankForm>({
    holder_name: "",
    holder_document: "",
    bank_code: "",
    branch_number: "",
    account_number: "",
    account_check_digit: "",
    type: "checking",
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const ok = useMemo(() =>
    Object.entries(form).every(([k, v]) => k === "type" || String(v).trim().length > 0),
    [form]);

  const set = <K extends keyof BankForm>(k: K, v: BankForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!ok) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("no_session");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).functions.invoke("create-pagarme-recipient", {
        body: { bank: form, transfer_interval: "weekly" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone(true);
      toast.success("Conta bancária registrada!");
    } catch (e) {
      toast.error("Falha ao registrar conta bancária.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="text-emerald-500" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-display font-black">Tudo pronto!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Seu perfil está configurado. Clique abaixo para começar a receber pedidos.
          </p>
        </div>
        <PrimaryButton onClick={onFinish} loading={finishing}>
          Ir para meu painel <ArrowRight size={14} />
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StepHeader icon={Landmark} title="Dados bancários" subtitle="Para receber pagamentos pelos serviços que prestar." />
      <Field label="Titular da conta">
        <input value={form.holder_name} onChange={(e) => set("holder_name", e.target.value)}
          className={inputCls} placeholder="Nome completo" />
      </Field>
      <Field label="CPF ou CNPJ do titular">
        <input value={form.holder_document} onChange={(e) => set("holder_document", e.target.value)}
          className={inputCls} placeholder="somente números" />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Banco (nº)">
          <input value={form.bank_code} onChange={(e) => set("bank_code", e.target.value)}
            className={inputCls} placeholder="001" />
        </Field>
        <Field label="Agência">
          <input value={form.branch_number} onChange={(e) => set("branch_number", e.target.value)}
            className={inputCls} placeholder="1234" />
        </Field>
        <Field label="Tipo">
          <select value={form.type} onChange={(e) => set("type", e.target.value as "checking" | "savings")}
            className={inputCls}>
            <option value="checking">Corrente</option>
            <option value="savings">Poupança</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Conta">
          <input value={form.account_number} onChange={(e) => set("account_number", e.target.value)}
            className={inputCls} placeholder="56789" />
        </Field>
        <Field label="Dígito">
          <input value={form.account_check_digit} onChange={(e) => set("account_check_digit", e.target.value)}
            className={inputCls} placeholder="0" />
        </Field>
      </div>
      <StepNav onBack={onBack} onNext={submit} loading={saving} disabled={!ok} nextLabel="Salvar conta" />
    </div>
  );
}

/* ───────────── shared bits ───────────── */

const inputCls =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StepHeader({
  icon: Icon, title, subtitle,
}: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-display font-black tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function StepNav({
  onBack, onNext, loading, disabled, nextLabel = "Continuar",
}: {
  onBack: () => void;
  onNext: () => void;
  loading?: boolean;
  disabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-3 rounded-xl border border-border text-sm font-bold flex items-center gap-1.5 hover:bg-muted transition"
      >
        <ArrowLeft size={14} /> Voltar
      </button>
      <PrimaryButton onClick={onNext} loading={loading} disabled={disabled} flex>
        {nextLabel} <ArrowRight size={14} />
      </PrimaryButton>
    </div>
  );
}

function PrimaryButton({
  children, onClick, loading, disabled, flex,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  flex?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={[
        flex ? "flex-1" : "w-full",
        "py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest",
        "hover:bg-primary/90 active:scale-[0.98] transition flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      {loading ? "Salvando..." : children}
    </button>
  );
}
