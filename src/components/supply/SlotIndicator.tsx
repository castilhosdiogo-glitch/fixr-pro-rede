import { SlotOccupancy, SLOT_STATUS_CONFIG } from "@/hooks/useSupplyControl";

interface SlotIndicatorProps {
  slot: SlotOccupancy;
  /** Show numeric count and percentage alongside the bar */
  showDetails?: boolean;
  /** Compact single-line mode for lists/badges */
  compact?: boolean;
}

/**
 * Visual scarcity indicator for a single category+city slot.
 *
 * Three visual states driven by occupancy percentage:
 *   OPEN        (<70%)  — green
 *   ALMOST_FULL (70–99%) — yellow
 *   FULL        (100%)  — red
 */
export const SlotIndicator = ({
  slot,
  showDetails = false,
  compact = false,
}: SlotIndicatorProps) => {
  const cfg = SLOT_STATUS_CONFIG[slot.status];
  const pct = Math.min(slot.occupancy_pct, 100);

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.barColor} ${slot.status === "FULL" ? "animate-pulse" : ""}`}
        />
        {cfg.label}
        {showDetails && slot.status !== "FULL" && (
          <span className="text-muted-foreground font-medium">
            · {slot.available_slots} vaga{slot.available_slots !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
          {cfg.label}
        </span>
        {showDetails && (
          <span className="text-[9px] font-bold text-muted-foreground tabular-nums">
            {slot.active_professionals}/{slot.max_professionals} · {pct}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cfg.barColor} ${slot.status === "FULL" ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Waiting list notice */}
      {slot.status === "FULL" && slot.waiting_count > 0 && (
        <p className="text-[9px] font-bold text-muted-foreground">
          {slot.waiting_count} pessoa{slot.waiting_count !== 1 ? "s" : ""} na fila de espera
        </p>
      )}
    </div>
  );
};
