import { useState } from "react";
import {
  BarChart3,
  Calendar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWeeklyReports,
  useGenerateWeeklyReport,
  WeeklyReport,
} from "@/hooks/useWeeklyReports";

// ─── Helpers ─────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

const fmtRange = (start: string, end: string) =>
  `${fmtDate(start)} → ${fmtDate(end)}`;

// ─── Stat Tile ───────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}

const StatTile = ({ label, value, hint, color = "text-foreground" }: StatTileProps) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className={`font-display font-black text-2xl ${color} tabular-nums`}>{value}</p>
    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">
      {label}
    </p>
    {hint && (
      <p className="text-[8px] text-muted-foreground/70 mt-0.5">{hint}</p>
    )}
  </div>
);

// ─── Report Detail ───────────────────────────────────────────

const ReportDetail = ({ report }: { report: WeeklyReport }) => {
  const s = report.summary;
  const b = s.broadcasts;
  const h = s.supply_health;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Broadcasts */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Pedidos da semana
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total" value={b.total} color="text-primary" />
          <StatTile
            label="Aceitos"
            value={b.accepted}
            hint={`${b.accept_rate}% taxa aceitação`}
            color="text-green-400"
          />
          <StatTile
            label="Resp. média"
            value={`${b.avg_response_minutes}m`}
            color="text-foreground"
          />
          <StatTile
            label="Expirados"
            value={b.expired}
            hint={`${b.cancelled} cancelados`}
            color="text-yellow-400"
          />
        </div>
      </div>

      {/* Pros + waiting list */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Profissionais & fila
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Pros ativos" value={s.pros.active_total} color="text-foreground" />
          <StatTile
            label="Novos cadastros"
            value={s.pros.new_signups_week}
            hint="esta semana"
            color="text-primary"
          />
          <StatTile
            label="Onboarding ✓"
            value={s.pros.onboarded_week}
            hint="esta semana"
            color="text-green-400"
          />
          <StatTile
            label="Na fila"
            value={s.waiting_list.pending_total}
            hint={`+${s.waiting_list.added_this_week} / -${s.waiting_list.notified_this_week}`}
            color="text-primary"
          />
        </div>
      </div>

      {/* Supply health alerts */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">
          Saúde da oferta
        </p>
        <div className="space-y-3">
          {/* No pros — vermelho */}
          {h.no_pros_slots?.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
                  Sem profissionais ({h.no_pros_slots.length})
                </p>
              </div>
              <ul className="space-y-1">
                {h.no_pros_slots.map((item, i) => (
                  <li
                    key={`${item.category_id}-${item.city}-${i}`}
                    className="text-[10px] text-foreground/80"
                  >
                    {item.category_name} · {item.city}{" "}
                    <span className="text-muted-foreground">
                      (limite {item.max_slots})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Over demand — verde (oportunidade) */}
          {h.over_demand?.length > 0 && (
            <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-green-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-green-400">
                  Oportunidade de expansão ({h.over_demand.length})
                </p>
              </div>
              <ul className="space-y-1">
                {h.over_demand.map((item, i) => (
                  <li
                    key={`${item.category_id}-${item.city}-${i}`}
                    className="text-[10px] text-foreground/80"
                  >
                    {item.category_name} · {item.city}{" "}
                    <span className="text-muted-foreground">
                      ({item.orders_per_pro} ped/pro · {item.active_pros} pros)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Under demand — amarelo */}
          {h.under_demand?.length > 0 && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-yellow-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                  Subdemanda — não expandir ({h.under_demand.length})
                </p>
              </div>
              <ul className="space-y-1">
                {h.under_demand.map((item, i) => (
                  <li
                    key={`${item.category_id}-${item.city}-${i}`}
                    className="text-[10px] text-foreground/80"
                  >
                    {item.category_name} · {item.city}{" "}
                    <span className="text-muted-foreground">
                      ({item.orders_per_pro} ped/pro · {item.active_pros} pros)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {h.healthy_count > 0 && (
            <div className="flex items-center gap-2 pl-1">
              <CheckCircle2 size={12} className="text-green-400" />
              <p className="text-[10px] font-bold text-muted-foreground">
                {h.healthy_count} slots saudáveis (5-8 ped/pro)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* By city */}
      {s.by_city?.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Por cidade
          </p>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {s.by_city
              .sort((a, b) => b.total - a.total)
              .map((c) => (
                <div
                  key={c.city}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-[11px] font-bold text-foreground">{c.city}</p>
                  <div className="flex items-center gap-3 text-[10px] tabular-nums">
                    <span className="text-primary font-black">{c.total}</span>
                    <span className="text-muted-foreground">
                      ({c.accepted} aceitos)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* By category */}
      {s.by_category?.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-3">
            Por categoria
          </p>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {s.by_category
              .sort((a, b) => b.total - a.total)
              .map((c) => (
                <div
                  key={c.category_id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-[11px] font-bold text-foreground capitalize">
                    {c.category_name ?? c.category_id}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] tabular-nums">
                    <span className="text-primary font-black">{c.total}</span>
                    <span className="text-muted-foreground">
                      ({c.accepted} aceitos)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Section ────────────────────────────────────────────

export const WeeklyReportsSection = () => {
  const { data: reports = [], isLoading } = useWeeklyReports(12);
  const { mutateAsync: generateNow, isPending: generating } = useGenerateWeeklyReport();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // expande o mais recente por padrão
  const latestId = reports[0]?.id ?? null;
  const activeId = expandedId ?? latestId;

  const handleGenerate = async () => {
    try {
      await generateNow(undefined);
      toast.success("Relatório da semana anterior gerado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar relatório.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">
          Carregando relatórios...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header + generate button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-display font-black text-xs uppercase tracking-[0.25em] text-foreground">
            Relatórios Semanais
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Snapshot toda segunda 08h (BRT) · semana anterior
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          <RefreshCw size={12} className={generating ? "animate-spin" : ""} />
          {generating ? "Gerando..." : "Gerar agora"}
        </button>
      </div>

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <BarChart3 size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Nenhum relatório ainda
          </p>
          <p className="text-[9px] text-muted-foreground/70 mt-2">
            Clique em "Gerar agora" pra criar o da semana anterior.
          </p>
        </div>
      )}

      {/* Report list */}
      {reports.map((r) => {
        const expanded = r.id === activeId;
        const b = r.summary.broadcasts;
        return (
          <div
            key={r.id}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expanded ? "" : r.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-4 hover:bg-secondary/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Calendar size={14} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-display font-black text-xs uppercase tracking-widest text-foreground">
                    {fmtRange(r.week_start, r.week_end)}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={10} />
                      {b.total} pedidos
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      {b.accept_rate}% aceitos
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {b.avg_response_minutes}m
                    </span>
                  </div>
                </div>
              </div>
              {expanded ? (
                <ChevronUp size={16} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={16} className="text-muted-foreground" />
              )}
            </button>

            {expanded && (
              <div className="px-4 pb-5 pt-1 border-t border-border">
                <ReportDetail report={r} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
