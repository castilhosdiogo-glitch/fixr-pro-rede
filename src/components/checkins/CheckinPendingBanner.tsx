import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { usePendingCheckins } from "@/hooks/useServiceCheckins";
import ServiceCheckinModal from "./ServiceCheckinModal";

export default function CheckinPendingBanner() {
  const { data: pending = [] } = usePendingCheckins();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (!pending.length) return null;

  const active = pending.find((c) => c.id === activeId);

  return (
    <>
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircleQuestion size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
            Como está indo? ({pending.length})
          </span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {pending.slice(0, 5).map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveId(c.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-background border border-border rounded-xl hover:border-primary transition-colors text-left"
              >
                <p className="text-xs font-black text-foreground truncate">{c.service_description}</p>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary flex-shrink-0">
                  Responder
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {active && <ServiceCheckinModal checkin={active} onClose={() => setActiveId(null)} />}
    </>
  );
}
