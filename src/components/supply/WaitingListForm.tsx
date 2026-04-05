import { useState } from "react";
import { Phone, User, CheckCircle, Clock } from "lucide-react";
import { useJoinWaitingList } from "@/hooks/useWaitingList";
import { toast } from "sonner";

interface WaitingListFormProps {
  categoryId: string;
  categoryName: string;
  city: string;
  /** Called after a successful submission */
  onSuccess?: () => void;
}

/**
 * Shown when a professional attempts to register in a FULL slot.
 * Collects name + phone and adds them to the waiting list.
 * Uses the FIFO queue — they'll be notified when a slot opens.
 */
export const WaitingListForm = ({
  categoryId,
  categoryName,
  city,
  onSuccess,
}: WaitingListFormProps) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: join, isPending } = useJoinWaitingList();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    try {
      await join({ name: name.trim(), phone: phone.trim(), category_id: categoryId, city });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      toast.error("Não foi possível entrar na fila. Tente novamente.");
    }
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 space-y-3 text-center animate-in fade-in duration-300">
        <CheckCircle size={40} className="text-green-400 mx-auto" />
        <p className="font-display font-black text-sm uppercase tracking-widest text-green-400">
          Você está na fila!
        </p>
        <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
          Quando uma vaga de <span className="text-foreground font-bold">{categoryName}</span> em{" "}
          <span className="text-foreground font-bold">{city}</span> abrir, entraremos em contato
          pelo número informado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Clock size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-display font-black text-xs uppercase tracking-widest text-red-400">
            Vagas esgotadas
          </p>
          <p className="text-[10px] font-medium text-muted-foreground mt-1 leading-relaxed">
            Todas as vagas para <span className="text-foreground font-bold">{categoryName}</span>{" "}
            em <span className="text-foreground font-bold">{city}</span> estão ocupadas. Entre na
            fila e seja avisado quando abrir uma vaga.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-3 bg-secondary/20 border border-border rounded-2xl px-4 py-3.5 focus-within:border-primary transition-all">
          <User size={16} className="text-primary flex-shrink-0" />
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="SEU NOME COMPLETO"
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/30 outline-none uppercase tracking-wider"
          />
        </div>

        <div className="flex items-center gap-3 bg-secondary/20 border border-border rounded-2xl px-4 py-3.5 focus-within:border-primary transition-all">
          <Phone size={16} className="text-primary flex-shrink-0" />
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(51) 99999-0000"
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/30 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 bg-primary text-primary-foreground font-display font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
        >
          {isPending ? "Aguarde..." : "Entrar na Fila de Espera"}
        </button>
      </form>
    </div>
  );
};
