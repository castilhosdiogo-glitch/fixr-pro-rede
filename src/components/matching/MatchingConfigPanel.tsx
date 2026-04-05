import { useState, useEffect } from "react";
import { Save, RotateCcw, Info } from "lucide-react";
import { useMatchingConfig, useUpdateMatchingConfig, MatchingConfig } from "@/hooks/useMatchingEngine";
import { toast } from "sonner";

// ─── Weight slider row ────────────────────────────────────────

interface WeightRowProps {
  label: string;
  description: string;
  field: keyof MatchingConfig;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (field: keyof MatchingConfig, v: number) => void;
}

const WeightRow = ({ label, description, field, value, min = 0, max = 1, step = 0.01, onChange }: WeightRowProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{label}</span>
        <span className="group relative">
          <Info size={10} className="text-muted-foreground cursor-help" />
          <span className="absolute left-4 bottom-4 z-10 hidden group-hover:block w-48 rounded-xl bg-card border border-border px-3 py-2 text-[9px] font-medium text-muted-foreground shadow-lg">
            {description}
          </span>
        </span>
      </div>
      <span className="text-[10px] font-black text-primary tabular-nums w-10 text-right">
        {value.toFixed(2)}
      </span>
    </div>
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(field, parseFloat(e.target.value))}
        className="flex-1 h-1.5 accent-primary cursor-pointer"
      />
      <div
        className="h-1.5 w-16 rounded-full bg-primary/20 overflow-hidden"
        style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${value * 100}%, hsl(var(--muted)) ${value * 100}%)` }}
      />
    </div>
  </div>
);

// ─── Numeric input row ────────────────────────────────────────

interface ParamRowProps {
  label: string;
  description: string;
  field: keyof MatchingConfig;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (field: keyof MatchingConfig, v: number) => void;
}

const ParamRow = ({ label, description, field, value, min, max, step = 1, unit, onChange }: ParamRowProps) => (
  <div className="flex items-center justify-between gap-4 py-2">
    <div className="flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{label}</p>
      <p className="text-[8px] font-medium text-muted-foreground mt-0.5">{description}</p>
    </div>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(field, parseFloat(e.target.value))}
        className="w-16 bg-secondary/20 border border-border rounded-xl px-2 py-1.5 text-xs font-black text-foreground text-center outline-none focus:border-primary tabular-nums"
      />
      {unit && <span className="text-[9px] font-bold text-muted-foreground">{unit}</span>}
    </div>
  </div>
);

// ─── Main panel ───────────────────────────────────────────────

export const MatchingConfigPanel = () => {
  const { data: config, isLoading } = useMatchingConfig();
  const { mutateAsync: save, isPending: saving } = useUpdateMatchingConfig();
  const [draft, setDraft] = useState<Partial<MatchingConfig>>({});

  // Sync draft when config loads
  useEffect(() => {
    if (config) setDraft({ ...config });
  }, [config]);

  if (isLoading || !config) {
    return (
      <div className="py-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
          Carregando configurações...
        </p>
      </div>
    );
  }

  const current = { ...config, ...draft };

  const update = (field: keyof MatchingConfig, value: number) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await save(draft);
      toast.success("Configurações salvas.");
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  };

  const handleReset = () => {
    setDraft({ ...config });
    toast.info("Alterações descartadas.");
  };

  // Weight sum indicator
  const weightSum = [
    current.weight_rating,
    current.weight_distance,
    current.weight_response_time,
    current.weight_acceptance_rate,
    current.weight_completed,
    current.weight_activity,
    current.weight_plan,
  ].reduce((a, b) => a + b, 0);
  const weightOk = Math.abs(weightSum - 1.0) < 0.05;

  return (
    <div className="space-y-6">
      {/* Weight sum indicator */}
      <div className={`rounded-2xl border px-4 py-3 flex items-center justify-between ${weightOk ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <p className={`text-[9px] font-black uppercase tracking-widest ${weightOk ? "text-green-400" : "text-yellow-400"}`}>
          {weightOk ? "Pesos equilibrados" : "Pesos fora do ideal"}
        </p>
        <span className={`text-[10px] font-black tabular-nums ${weightOk ? "text-green-400" : "text-yellow-400"}`}>
          Σ = {weightSum.toFixed(2)} {weightOk ? "✓" : "(ideal: 1.00)"}
        </span>
      </div>

      {/* Ranking weights */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground border-l-2 border-primary pl-3">
          Pesos de Ranqueamento
        </h3>
        <WeightRow field="weight_rating"          label="Avaliação"         description="Nota média de 1–5 estrelas do profissional."           value={current.weight_rating}          onChange={update} />
        <WeightRow field="weight_distance"         label="Distância"         description="Mesma cidade = 1.0, cidade diferente = 0.3."           value={current.weight_distance}        onChange={update} />
        <WeightRow field="weight_response_time"    label="Tempo de Resposta" description="Inversamente proporcional ao tempo médio de resposta." value={current.weight_response_time}   onChange={update} />
        <WeightRow field="weight_acceptance_rate"  label="Taxa de Aceitação" description="Proporção de solicitações aceitas historicamente."     value={current.weight_acceptance_rate} onChange={update} />
        <WeightRow field="weight_completed"        label="Serviços Feitos"   description="Logaritmo do total de serviços concluídos (cap 100)."  value={current.weight_completed}       onChange={update} />
        <WeightRow field="weight_activity"         label="Atividade Recente" description="Decaimento exponencial desde a última atividade."      value={current.weight_activity}        onChange={update} />
        <WeightRow field="weight_plan"             label="Plano"             description="Premium=1.0, Basic=0.6, Free=0.2."                     value={current.weight_plan}            onChange={update} />
      </div>

      {/* Dispatch parameters */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground border-l-2 border-primary pl-3 mb-3">
          Parâmetros de Distribuição
        </h3>
        <ParamRow field="dispatch_limit"         label="Top-N por rodada"           description="Quantos profissionais recebem a solicitação na 1ª rodada."      value={current.dispatch_limit}         min={1} max={20}  unit="pros"  onChange={update} />
        <ParamRow field="response_window_minutes" label="Janela de resposta"          description="Tempo para o profissional aceitar antes de expirar."           value={current.response_window_minutes} min={1} max={60}  unit="min"   onChange={update} />
        <ParamRow field="max_concurrent_per_pro"  label="Máx. simultâneos / pro"      description="Quantas solicitações pendentes um profissional pode ter."       value={current.max_concurrent_per_pro} min={1} max={10}  unit="req"   onChange={update} />
        <ParamRow field="expansion_batch_size"    label="Batch de expansão"           description="Quantos novos profissionais são contatados em cada expansão."  value={current.expansion_batch_size}   min={1} max={10}  unit="pros"  onChange={update} />
      </div>

      {/* Fairness parameters */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-1">
        <h3 className="font-display font-black text-[10px] uppercase tracking-[0.3em] text-foreground border-l-2 border-primary pl-3 mb-3">
          Fairness & Round-Robin
        </h3>
        <ParamRow field="fairness_half_life_hours" label="Meia-vida penalidade"  description="Horas até a penalidade de receber pedido recente cair pela metade." value={current.fairness_half_life_hours} min={1} max={48}  step={0.5} unit="h"    onChange={update} />
        <ParamRow field="inactivity_boost_7d"      label="Boost 7+ dias sem req" description="Bônus absoluto para profissionais sem pedido há 7+ dias."           value={current.inactivity_boost_7d}     min={0} max={0.5} step={0.01} unit="+sc" onChange={update} />
        <ParamRow field="inactivity_boost_3d"      label="Boost 3–7 dias sem req" description="Bônus para profissionais sem pedido há 3–7 dias."                  value={current.inactivity_boost_3d}     min={0} max={0.3} step={0.01} unit="+sc" onChange={update} />
        <ParamRow field="inactivity_boost_1d"      label="Boost 1–3 dias sem req" description="Bônus para profissionais sem pedido há 1–3 dias."                  value={current.inactivity_boost_1d}     min={0} max={0.1} step={0.01} unit="+sc" onChange={update} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-border bg-secondary/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
        >
          <RotateCcw size={13} />
          Descartar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.3em] hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save size={13} />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
};
