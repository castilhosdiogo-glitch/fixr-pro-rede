import { useState, useRef } from "react";
import { Upload, Camera, FileText, CheckCircle, AlertCircle, Clock, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useMyKyc, useSubmitKyc, type KycFormData, type DocumentType } from "@/hooks/useKyc";

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    label: "Aguardando análise",
    desc: "Seu envio foi recebido e está na fila de revisão.",
  },
  under_review: {
    icon: Clock,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
    label: "Em análise",
    desc: "Nossa equipe está revisando seus documentos.",
  },
  approved: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    label: "Verificado!",
    desc: "Seu perfil agora exibe o selo de profissional verificado.",
  },
  rejected: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/30",
    label: "Não aprovado",
    desc: "Verifique o motivo abaixo e reenvie os documentos.",
  },
};

function FileSlot({
  label,
  hint,
  icon: Icon,
  file,
  onChange,
  required,
}: {
  label: string;
  hint: string;
  icon: React.ElementType;
  file: File | null;
  onChange: (f: File | null) => void;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={[
          "w-full rounded-2xl border-2 border-dashed p-5 flex flex-col items-center gap-2 transition-all",
          file
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-border hover:border-primary/50 hover:bg-primary/5",
        ].join(" ")}
      >
        {file ? (
          <>
            <CheckCircle size={20} className="text-emerald-500" />
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest truncate max-w-full px-2">
              {file.name}
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-[9px] text-muted-foreground hover:text-destructive flex items-center gap-1"
            >
              <X size={10} /> Remover
            </button>
          </>
        ) : (
          <>
            <Icon size={20} className="text-muted-foreground" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Toque para selecionar
            </p>
            <p className="text-[9px] text-muted-foreground">{hint}</p>
          </>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export function KycUploadForm() {
  const { data: kyc, isLoading } = useMyKyc();
  const { mutateAsync: submit, isPending } = useSubmitKyc();

  const [form, setForm] = useState<KycFormData>({
    full_legal_name: "",
    document_type: "cpf",
    document_number: "",
    selfie: null,
    document_front: null,
    document_back: null,
  });

  const set = (key: keyof KycFormData, val: KycFormData[keyof KycFormData]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_legal_name.trim()) { toast.error("Informe seu nome completo."); return; }
    if (!form.document_number.trim()) { toast.error("Informe o número do documento."); return; }
    if (!form.selfie)         { toast.error("Foto (selfie) é obrigatória."); return; }
    if (!form.document_front) { toast.error("Frente do documento é obrigatória."); return; }

    try {
      await submit(form);
      toast.success("Documentos enviados! Aguarde a análise.");
    } catch {
      toast.error("Erro ao enviar documentos. Tente novamente.");
    }
  }

  if (isLoading) {
    return <div className="rounded-2xl border border-border bg-card p-6 animate-pulse h-40" />;
  }

  if (kyc && kyc.status !== "rejected") {
    const cfg = STATUS_CONFIG[kyc.status];
    const Icon = cfg.icon;
    return (
      <div className={`rounded-2xl border p-5 space-y-3 ${cfg.bg}`}>
        <div className="flex items-center gap-3">
          <Icon size={20} className={cfg.color} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{cfg.label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{cfg.desc}</p>
          </div>
        </div>
        {kyc.status === "approved" && (
          <div className="flex items-center gap-2 pt-1">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Profissional Verificado
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground">
          Verificação de Identidade
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Envie seus documentos para receber o selo de profissional verificado.
        </p>
      </div>

      {kyc?.status === "rejected" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
            Motivo da rejeição
          </p>
          <p className="text-[10px] text-muted-foreground">
            {kyc.rejection_reason ?? "Documento ilegível ou informações incorretas."}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
            Nome completo (conforme documento) <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.full_legal_name}
            onChange={(e) => set("full_legal_name", e.target.value)}
            placeholder="Ex: João da Silva Oliveira"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Documento <span className="text-destructive">*</span>
            </label>
            <select
              value={form.document_type}
              onChange={(e) => set("document_type", e.target.value as DocumentType)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="cpf">CPF</option>
              <option value="rg">RG</option>
              <option value="cnh">CNH</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Número <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.document_number}
              onChange={(e) => set("document_number", e.target.value)}
              placeholder="000.000.000-00"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <FileSlot
          label="Selfie segurando o documento"
          hint="Foto clara do rosto + documento visível"
          icon={Camera}
          file={form.selfie}
          onChange={(f) => set("selfie", f)}
          required
        />
        <FileSlot
          label="Frente do documento"
          hint="CPF, RG ou CNH — frente"
          icon={FileText}
          file={form.document_front}
          onChange={(f) => set("document_front", f)}
          required
        />
        <FileSlot
          label="Verso do documento"
          hint="Opcional para CPF"
          icon={FileText}
          file={form.document_back}
          onChange={(f) => set("document_back", f)}
        />

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload size={14} />
          {isPending ? "Enviando..." : "Enviar para verificação"}
        </button>
      </form>
    </div>
  );
}
