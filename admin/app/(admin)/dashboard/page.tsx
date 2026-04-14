import Link from "next/link";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Briefcase,
  ShieldAlert,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatBRL, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getMetrics() {
  const supabase = createServiceRoleClient();

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    activeUsersRes,
    openServicesRes,
    completedServicesRes,
    pendingKycRes,
    suspendedRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("updated_at", last24h),
    supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "accepted", "in_progress"]),
    supabase
      .from("service_requests")
      .select("id, created_at, status")
      .eq("status", "completed")
      .gte("created_at", last7d),
    supabase
      .from("kyc_submissions")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "under_review"]),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .not("suspended_at", "is", null),
  ]);

  const gmv7d = 0; // pending: valor_total column not yet on service_requests

  return {
    activeUsers: activeUsersRes.count ?? 0,
    openServices: openServicesRes.count ?? 0,
    completed7d: completedServicesRes.data?.length ?? 0,
    gmv7d,
    pendingKyc: pendingKycRes.count ?? 0,
    suspended: suspendedRes.count ?? 0,
    alerts: (pendingKycRes.count ?? 0) + (suspendedRes.count ?? 0),
  };
}

async function getRecentAlerts() {
  const supabase = createServiceRoleClient();
  const { data: kyc } = await supabase
    .from("kyc_submissions")
    .select("id, full_legal_name, status, submitted_at")
    .in("status", ["pending", "under_review"])
    .order("submitted_at", { ascending: false })
    .limit(5);

  return kyc ?? [];
}

export default async function DashboardPage() {
  const [metrics, alerts] = await Promise.all([getMetrics(), getRecentAlerts()]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-sm text-slate-500 mt-1">
          Métricas em tempo real e alertas prioritários.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Usuários ativos"
          value={metrics.activeUsers.toLocaleString("pt-BR")}
          hint="últimas 24h"
        />
        <MetricCard
          icon={Briefcase}
          label="Serviços em aberto"
          value={metrics.openServices.toLocaleString("pt-BR")}
          hint="pending · accepted · in_progress"
        />
        <MetricCard
          icon={TrendingUp}
          label="Concluídos (7d)"
          value={metrics.completed7d.toLocaleString("pt-BR")}
          hint={metrics.gmv7d > 0 ? formatBRL(metrics.gmv7d) : "volume em breve"}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alertas"
          value={metrics.alerts.toLocaleString("pt-BR")}
          hint="ações pendentes"
          tone={metrics.alerts > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <PriorityCard
          icon={FileCheck}
          title="KYC pendentes"
          count={metrics.pendingKyc}
          href="/usuarios?filter=kyc_pending"
          emptyLabel="Nenhum KYC aguardando"
        />
        <PriorityCard
          icon={ShieldAlert}
          title="Usuários suspensos"
          count={metrics.suspended}
          href="/usuarios?filter=suspended"
          emptyLabel="Nenhum usuário suspenso"
        />
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-slate-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Crescimento
            </h3>
          </div>
          <p className="text-2xl font-semibold mt-3 tracking-tight text-slate-900">—</p>
          <p className="text-[11px] text-slate-400 mt-1">em breve</p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">KYC aguardando revisão</h2>
          <Link
            href="/usuarios?filter=kyc_pending"
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Ver todos →
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">
            Nenhum envio aguardando revisão.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((item) => (
              <li
                key={item.id}
                className="px-5 py-3 flex items-center justify-between text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.full_legal_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    enviado {timeAgo(item.submitted_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={item.status === "under_review" ? "info" : "warning"}>
                    {item.status === "under_review" ? "Em análise" : "Pendente"}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning";
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon
          size={16}
          className={tone === "warning" ? "text-amber-500" : "text-slate-400"}
        />
      </div>
      <p className="text-2xl font-semibold mt-2 tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function PriorityCard({
  icon: Icon,
  title,
  count,
  href,
  emptyLabel,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  href: string;
  emptyLabel: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-slate-200 p-5 hover:border-brand-300 transition-colors block"
    >
      <div className="flex items-center gap-2">
        <Icon size={15} className={count > 0 ? "text-amber-500" : "text-slate-400"} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          {title}
        </h3>
      </div>
      <p className="text-2xl font-semibold mt-3 tracking-tight text-slate-900">
        {count.toLocaleString("pt-BR")}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">
        {count === 0 ? emptyLabel : "clique para revisar"}
      </p>
    </Link>
  );
}
