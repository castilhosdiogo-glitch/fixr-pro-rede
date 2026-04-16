import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles, MapPin, Hammer, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useOnboardingState, useSetClientAddress } from "@/hooks/useOnboarding";

const TOTAL = 3;

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: state, isLoading } = useOnboardingState();
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isLoading && state) {
      if (state.user_type !== "client") {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (state.completo) {
        setStep(3);
      }
    }
  }, [state, isLoading, navigate]);

  if (isLoading || !user) {
    return <div className="min-h-screen bg-background animate-pulse" />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <ProgressBar step={step} />
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 md:p-8 space-y-6">
          {step === 1 && (
            <StepWelcome name={profile?.full_name ?? ""} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <StepAddress onBack={() => setStep(1)} onNext={() => setStep(3)} />
          )}
          {step === 3 && <StepFirstOrder onBack={() => setStep(2)} />}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Progress ───────────── */

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
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ───────────── Step 1 ───────────── */

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  const firstName = name?.split(" ")[0] || "";
  return (
    <div className="text-center space-y-5">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
        <Sparkles className="text-primary" size={24} />
      </div>
      <div>
        <h1 className="text-2xl font-display font-black tracking-tight">
          Bem-vindo{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          A Fixr conecta você com profissionais verificados em minutos. Vamos
          começar configurando o seu endereço principal.
        </p>
      </div>
      <PrimaryButton onClick={onNext}>
        Começar <ArrowRight size={14} />
      </PrimaryButton>
    </div>
  );
}

/* ───────────── Step 2: endereço ───────────── */

function StepAddress({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const { profile } = useAuth();
  const [endereco, setEndereco] = useState("");
  const save = useSetClientAddress();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = (profile as any)?.endereco_principal as string | undefined;
    if (existing) setEndereco(existing);
  }, [profile]);

  const submit = async () => {
    if (endereco.trim().length < 10) {
      toast.error("Informe um endereço completo (rua, número, bairro, cidade).");
      return;
    }
    try {
      await save.mutateAsync({ endereco: endereco.trim() });
      onNext();
    } catch (e) {
      toast.error("Erro ao salvar endereço.");
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <StepHeader
        icon={MapPin}
        title="Seu endereço principal"
        subtitle="Usamos para encontrar profissionais próximos."
      />
      <div>
        <Label>Endereço completo</Label>
        <textarea
          rows={3}
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Rua, número, bairro, cidade, estado"
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Seu endereço fica privado até você aceitar um orçamento.
        </p>
      </div>
      <StepNav
        onBack={onBack}
        onNext={submit}
        loading={save.isPending}
        disabled={endereco.trim().length < 10}
      />
    </div>
  );
}

/* ───────────── Step 3: primeiro pedido guiado ───────────── */

function StepFirstOrder({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();

  return (
    <div className="space-y-5">
      <StepHeader
        icon={Hammer}
        title="Quase lá! Que tal fazer seu primeiro pedido?"
        subtitle="Escolha uma categoria e publique seu serviço em 30 segundos."
      />
      <div className="grid grid-cols-2 gap-3">
        {categories.slice(0, 6).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => navigate(`/solicitar?cat=${c.id}`)}
            className="p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition text-left"
          >
            <p className="text-sm font-bold">{c.name}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Publicar pedido</p>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-3 rounded-xl border border-border text-sm font-bold flex items-center gap-1.5 hover:bg-muted transition"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-black uppercase tracking-widest hover:bg-muted transition flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={14} /> Mais tarde
        </button>
      </div>
    </div>
  );
}

/* ───────────── shared ───────────── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1.5">
      {children}
    </label>
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
  onBack, onNext, loading, disabled,
}: { onBack: () => void; onNext: () => void; loading?: boolean; disabled?: boolean }) {
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
        Continuar <ArrowRight size={14} />
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
