import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushSupport, useHasPushSubscription, useEnablePush, useDisablePush } from "@/hooks/usePushNotifications";

export function PushToggle() {
  const { permission } = usePushSupport();
  const { data: isEnabled, isLoading } = useHasPushSubscription();
  const { mutate: enable, isPending: enabling } = useEnablePush();
  const { mutate: disable, isPending: disabling } = useDisablePush();

  const isPending = enabling || disabling;

  if (permission === "unsupported") return null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <Loader2 size={14} className="animate-spin text-muted-foreground" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Verificando notificações...
        </p>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
        <BellOff size={14} className="text-destructive flex-shrink-0" />
        <p className="text-[10px] font-black uppercase tracking-widest text-destructive">
          Notificações bloqueadas — libere nas configurações do navegador
        </p>
      </div>
    );
  }

  if (isEnabled) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell size={14} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Notificações ativas
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Você será alertado quando chegar uma nova solicitação.
            </p>
          </div>
        </div>
        <button
          onClick={() => disable()}
          disabled={isPending}
          className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {isPending ? <Loader2 size={12} className="animate-spin" /> : "Desativar"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => enable()}
      disabled={isPending}
      className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex items-center gap-3 hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin text-primary flex-shrink-0" />
      ) : (
        <Bell size={14} className="text-primary flex-shrink-0" />
      )}
      <div className="text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
          {isPending ? "Ativando..." : "Ativar notificações push"}
        </p>
        <p className="text-[9px] text-muted-foreground mt-0.5">
          Receba alertas imediatos de novas solicitações
        </p>
      </div>
    </button>
  );
}
