import Link from "next/link";
import { Award, AlertTriangle, TrendingDown, Clock, Shield, type LucideIcon } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

function nivelTone(nivel: string | null): Tone {
  switch (nivel) {
    case "fixr_select":
      return "warning";
    case "fixr_parceiro":
      return "info";
    case "fixr_explorador":
      return "neutral";
    case "fixr_restrito":
      return "danger";
    default:
      return "neutral";
  }
}

function nivelLabel(nivel: string | null): string {
  switch (nivel) {
    case "fixr_select":
      return "SELECT";
    case "fixr_parceiro":
      return "PARCEIRO";
    case "fixr_explorador":
      return "EXPLORADOR";
    case "fixr_restrito":
      return "RESTRITO";
    default:
      return "—";
  }
}

async function fetchData() {
  const supabase = createServiceRoleClient();

  const { data: allPros } = await supabase
    .from("professional_profiles")
    .select(
      "id, user_id, nivel_curadoria, fixr_score, select_conquistado_em, select_perdido_em, bloqueado_ate, select_suspendido_ate, nivel_manual_override, total_concluidos, disputas_perdidas_90d",
    );

  const profileIds = (allPros ?? []).map((p) => p.user_id);
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", profileIds)
    : { data: [] };

  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.user_id as string, (p.full_name as string) ?? "—");
  }

  const pros = (allPros ?? []).map((p) => ({
    ...p,
    full_name: nameById.get(p.user_id as string) ?? "—",
  }));

  const selectActive = pros.filter((p) => p.nivel_curadoria === "fixr_select");
  const atRisk = pros.filter(
    (p) => p.fixr_score != null && p.fixr_score >= 70 && p.fixr_score < 85 && p.nivel_curadoria !== "fixr_restrito",
  );
  const restricted = pros.filter((p) => p.nivel_curadoria === "fixr_restrito");
  const blocked = pros.filter((p) => p.bloqueado_ate && new Date(p.bloqueado_ate as string) > new Date());

  const { data: recentEvents } = await supabase
    .from("curation_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  const eventUserIds = Array.from(new Set((recentEvents ?? []).map((e) => e.professional_user_id as string)));
  const { data: eventProfiles } = eventUserIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", eventUserIds)
    : { data: [] };
  const eventNameById = new Map<string, string>();
  for (const p of eventProfiles ?? []) {
    eventNameById.set(p.user_id as string, (p.full_name as string) ?? "—");
  }

  const events = (recentEvents ?? []).map((e) => ({
    ...e,
    full_name: eventNameById.get(e.professional_user_id as string) ?? "—",
  }));

  const unreviewedCritical = events.filter((e) => e.severity === "critical" && !e.admin_reviewed).length;

  return { selectActive, atRisk, restricted, blocked, events, unreviewedCritical };
}

export default async function CuradoriaPage() {
  const { selectActive, atRisk, restricted, blocked, events, unreviewedCritical } = await fetchData();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            Curadoria Fixr
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Níveis, eventos críticos e ações manuais sobre profissionais.
          </p>
        </div>
        {unreviewedCritical > 0 && (
          <Badge tone="danger">{unreviewedCritical} evento(s) crítico(s) sem revisão</Badge>
        )}
      </header>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard icon={Award} label="Select ativos" value={selectActive.length} tone="warning" />
        <KpiCard icon={TrendingDown} label="Em risco (70-85)" value={atRisk.length} tone="warning" />
        <KpiCard icon={AlertTriangle} label="Restritos" value={restricted.length} tone="danger" />
        <KpiCard icon={Clock} label="Bloqueados 48h" value={blocked.length} tone="neutral" />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-4">
        <Table
          title="Fixr Select ativos"
          tone="warning"
          rows={selectActive.map((p) => ({
            id: p.user_id as string,
            name: p.full_name,
            score: p.fixr_score,
            nivel: p.nivel_curadoria,
            extra: p.select_conquistado_em ? `desde ${timeAgo(p.select_conquistado_em as string)}` : "",
            manual: Boolean(p.nivel_manual_override),
          }))}
        />
        <Table
          title="Em risco de rebaixamento"
          tone="warning"
          rows={atRisk.map((p) => ({
            id: p.user_id as string,
            name: p.full_name,
            score: p.fixr_score,
            nivel: p.nivel_curadoria,
            extra: p.disputas_perdidas_90d ? `${p.disputas_perdidas_90d} disputa(s)/90d` : "",
            manual: Boolean(p.nivel_manual_override),
          }))}
        />
        <Table
          title="Restritos (revisão manual)"
          tone="danger"
          rows={restricted.map((p) => ({
            id: p.user_id as string,
            name: p.full_name,
            score: p.fixr_score,
            nivel: p.nivel_curadoria,
            extra: p.bloqueado_ate ? `bloqueado até ${new Date(p.bloqueado_ate as string).toLocaleString("pt-BR")}` : "",
            manual: Boolean(p.nivel_manual_override),
          }))}
        />
        <Table
          title="Bloqueados 48h"
          tone="neutral"
          rows={blocked.map((p) => ({
            id: p.user_id as string,
            name: p.full_name,
            score: p.fixr_score,
            nivel: p.nivel_curadoria,
            extra: p.bloqueado_ate ? `até ${new Date(p.bloqueado_ate as string).toLocaleString("pt-BR")}` : "",
            manual: Boolean(p.nivel_manual_override),
          }))}
        />
      </div>

      {/* Events timeline */}
      <section className="bg-white border border-slate-200 rounded-xl">
        <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Shield size={14} className="text-slate-500" />
          <h2 className="text-sm font-semibold">Eventos de curadoria recentes</h2>
        </header>
        <ul className="divide-y divide-slate-100">
          {events.length === 0 && (
            <li className="px-4 py-6 text-sm text-slate-500 text-center">Sem eventos registrados.</li>
          )}
          {events.map((e) => (
            <li key={e.id as string} className="px-4 py-3 flex items-center gap-3">
              <Badge tone={e.severity === "critical" ? "danger" : e.severity === "warning" ? "warning" : "neutral"}>
                {String(e.event_type).replace(/_/g, " ")}
              </Badge>
              <Link
                href={`/usuarios/${e.professional_user_id}`}
                className="text-sm font-medium text-slate-900 hover:text-brand-700"
              >
                {e.full_name}
              </Link>
              {e.from_nivel && e.to_nivel && (
                <span className="text-xs text-slate-500">
                  {nivelLabel(e.from_nivel as string)} → {nivelLabel(e.to_nivel as string)}
                </span>
              )}
              <span className="flex-1 text-xs text-slate-500 truncate">{e.reason ?? ""}</span>
              <span className="text-[11px] text-slate-400">{timeAgo(e.created_at as string)}</span>
              {!e.admin_reviewed && e.severity === "critical" && (
                <Badge tone="danger">não revisado</Badge>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: Tone;
}) {
  const iconClass = {
    neutral: "text-slate-400",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-red-500",
    info: "text-brand-500",
  }[tone];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon size={14} className={iconClass} />
      </div>
      <p className="text-2xl font-semibold tracking-tight mt-2">{value}</p>
    </div>
  );
}

function Table({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: Tone;
  rows: { id: string; name: string; score: number | null; nivel: string | null; extra: string; manual: boolean }[];
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <header className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge tone={tone}>{rows.length}</Badge>
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500 text-center">—</p>
      ) : (
        <ul className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-2.5 flex items-center gap-3">
              <Link href={`/usuarios/${r.id}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate hover:text-brand-700">{r.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{r.extra}</p>
              </Link>
              <Badge tone={nivelTone(r.nivel)}>{nivelLabel(r.nivel)}</Badge>
              <span className="text-xs tabular-nums text-slate-600 w-10 text-right">
                {r.score != null ? Number(r.score).toFixed(0) : "—"}
              </span>
              {r.manual && <Badge tone="info">manual</Badge>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
