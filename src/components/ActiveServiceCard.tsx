import { CheckCircle2, MapPin, Calendar, Loader2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useMarkServiceCompleted, useScheduleService, type ActiveService } from "@/hooks/useServiceCompletion";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ActiveServiceCardProps {
  service: ActiveService;
}

export default function ActiveServiceCard({ service }: ActiveServiceCardProps) {
  const { mutate: complete, isPending: isCompleting } = useMarkServiceCompleted();
  const { mutate: schedule, isPending: isScheduling } = useScheduleService();
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);

  const handleComplete = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    complete(service.id, {
      onSuccess: () => {
        setDone(true);
        toast({ title: "Serviço concluído!", description: "O cliente será notificado para avaliar." });
      },
      onError: (err: Error) => {
        setConfirmed(false);
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleSchedule = () => {
    if (!scheduledDate) {
      toast({ title: "Selecione uma data e horário.", variant: "destructive" });
      return;
    }
    schedule(
      { requestId: service.id, scheduledDate: new Date(scheduledDate).toISOString() },
      {
        onSuccess: () => {
          setShowScheduler(false);
          toast({ title: "Agendado!", description: "O cliente foi notificado com a data e horário." });
        },
        onError: (err: Error) => {
          toast({ title: "Erro ao agendar", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, height: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3"
      >
        <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
          Concluído — cliente notificado
        </p>
      </motion.div>
    );
  }

  // Format scheduled date for display
  const scheduledLabel = service.scheduled_date
    ? new Date(service.scheduled_date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
      {/* Info row */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Calendar size={14} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black uppercase tracking-tight text-foreground truncate">
            {service.description}
          </p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
              Cliente: {service.client_name}
            </span>
            {service.client_city && (
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                <MapPin size={8} />
                {service.client_city}
              </span>
            )}
          </div>
          {scheduledLabel ? (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={10} className="text-primary" />
              <span className="text-[9px] font-black uppercase tracking-wider text-primary">
                {scheduledLabel}
              </span>
            </div>
          ) : (
            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">
              Aceito em {new Date(service.created_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex-shrink-0">
          {service.status === "accepted" ? "Em andamento" : "Agendado"}
        </span>
      </div>

      {/* Schedule section — only for accepted services */}
      {service.status === "accepted" && (
        <>
          {!showScheduler ? (
            <button
              onClick={() => setShowScheduler(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all"
            >
              <Calendar size={12} /> Propor Agendamento
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSchedule}
                  disabled={isScheduling || !scheduledDate}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isScheduling ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />}
                  {isScheduling ? "Agendando..." : "Confirmar"}
                </button>
                <button
                  onClick={() => { setShowScheduler(false); setScheduledDate(""); }}
                  className="px-4 py-2.5 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-display font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98] ${
          confirmed
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-secondary/20 text-foreground hover:bg-emerald-500/10 hover:text-emerald-600 border border-border hover:border-emerald-500/30"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isCompleting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CheckCircle2 size={14} />
        )}
        {isCompleting
          ? "Concluindo..."
          : confirmed
          ? "Confirmar conclusão"
          : "Marcar como concluído"}
      </button>

      {confirmed && !isCompleting && (
        <p className="text-[8px] font-black uppercase tracking-wider text-center text-muted-foreground">
          Clique novamente para confirmar • O cliente será notificado
        </p>
      )}
    </div>
  );
}
