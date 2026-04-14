import Link from "next/link";
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Ban,
  Crown,
  Sparkles,
  XCircle,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { forceUpgrade, cancelSubscription } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXPLORER_MONTHLY_LIMIT = 8;
const NEAR_LIMIT_THRESHOLD = 6;

type Tab = "near_limit" | "parceiros" | "all";

type ProRow = {
  id: string;
  user_id: string;
  full_name: string;
  plan_name: string;
  monthly_request_count: number;
  commission_rate: number;
};

async function fetchStats() {
  const supabase = createServiceRoleClient();

  const { data: all } = await supabase
    .from("professional_profiles")
    .select("plan_name, monthly_request_count");

  const exploradores = (all ?? []).filter((p) => p.plan_name === "explorador");
  const parceiros = (all ?? []).filter((p) => p.plan_name === "parceiro");
  const nearLimit = exploradores.filter(
    (p) => (p.monthly_request_count ?? 0) >= NEAR_LIMIT_THRESHOLD,
  );

  return {
    totalExploradores: exploradores.length,
    totalParceiros: parceiros.length,
    nearLimitCount: nearLimit.length,
  };
}

type FailedSub = {
  id: string;
  user_id: string;
  full_name: string;
  status: string;
  failure_count: number;
  failure_reason: string | null;
  last_failed_at: string | null;
};

async function fetchFailedSubs(): Promise<FailedSub[]> {
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, failure_count, failure_reason, last_failed_at")
    .in("status", ["past_due", "failed"])
    .order("last_failed_at", { ascending: false })
    .limit(20);

  if (!subs || subs.length === 0) return [];

  const userIds = subs.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name ?? "(sem nome)";

  return subs.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    full_name: nameMap[s.user_id] ?? "(sem nome)",
    status: s.status,
    failure_count: s.failure_count ?? 0,
    failure_reason: s.failure_reason,
    last_failed_at: s.last_failed_at,
  }));
}

async function fetchPros(tab: Tab): Promise<ProRow[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("professional_profiles")
    .select("id, user_id, plan_name, monthly_request_count, commission_rate")
    .limit(50);

  if (tab === "near_limit") {
    query = query
      .eq("plan_name", "explorador")
      .gte("monthly_request_count", NEAR_LIMIT_THRESHOLD)
      .order("monthly_request_count", { ascending: false });
  } else if (tab === "parceiros") {
    query = query.eq("plan_name", "parceiro").order("user_id");
  } else {
    query = query.order("monthly_request_count", { ascending: false });
  }

  const { data: pros } = await query;
  if (!pros || pros.length === 0) return [];

  const userIds = pros.map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name ?? "(sem nome)";

  return pros.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    full_name: nameMap[p.user_id] ?? "(sem nome)",
    plan_name: p.plan_name ?? "explorador",
    monthly_request_count: p.monthly_request_count ?? 0,
    commission_rate: Number(p.commission_rate ?? 15),
  }));
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const params = await searchParams;
  const tab = (params.tab ?? "near_limit") as Tab;

  const [stats, pros, failedSubs] = await Promise.all([
    fetchStats(),
    fetchPros(tab),
    fetchFailedSubs(),
  ]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explorador (grátis, 8 req/mês, 15%) · Parceiro (R$ 29,90, ilimitado, 10%).
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <KpiCard
          label="Exploradores"
          value={stats.totalExploradores.toString()}
          hint="Plano gratuito"
          icon={Sparkles}
          tone="neutral"
        />
        <KpiCard
          label="Parceiros"
          value={stats.totalParceiros.toString()}
          hint="Assinantes pagos"
          icon={Crown}
          tone="brand"
        />
        <KpiCard
          label="Próximos do limite"
          value={stats.nearLimitCount.toString()}
          hint={`Exploradores com ≥${NEAR_LIMIT_THRESHOLD} req/mês`}
          icon={TrendingUp}
          tone="warning"
        />
      </section>

      {failedSubs.length > 0 && (
        <section className="bg-white rounded-xl border border-red-200">
          <header className="px-5 py-3 border-b border-red-100 flex items-center gap-2 bg-red-50/50">
            <XCircle size={14} className="text-red-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              Assinaturas com falha ({failedSubs.length})
            </h2>
          </header>
          <ul className="divide-y divide-slate-100">
            {failedSubs.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/usuarios?q=${encodeURIComponent(s.full_name)}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700 truncate"
                    >
                      {s.full_name}
                    </Link>
                    <Badge tone={s.status === "failed" ? "danger" : "warning"}>
                      {s.status === "failed" ? "Falhou" : "Em atraso"}
                    </Badge>
                    {s.failure_count > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {s.failure_count} tentativa(s)
                      </span>
                    )}
                  </div>
                  {s.failure_reason && (
                    <p className="text-xs text-slate-600 mt-1">{s.failure_reason}</p>
                  )}
                  {s.last_failed_at && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Última falha: {formatDateTime(s.last_failed_at)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="flex items-center gap-1 flex-wrap">
        <TabLink current={tab} value="near_limit" label="Próximos do limite" />
        <TabLink current={tab} value="parceiros" label="Parceiros" />
        <TabLink current={tab} value="all" label="Todos" />
      </nav>

      <section className="bg-white rounded-xl border border-slate-200">
        {pros.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhum profissional nessa categoria.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pros.map((p) => (
              <ProRowItem key={p.id} pro={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProRowItem({ pro }: { pro: ProRow }) {
  const isExplorer = pro.plan_name === "explorador";
  const pct = Math.min(100, (pro.monthly_request_count / EXPLORER_MONTHLY_LIMIT) * 100);
  const atLimit = pro.monthly_request_count >= EXPLORER_MONTHLY_LIMIT;
  const barColor =
    pct >= 100 ? "bg-red-500" : pct >= 75 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/usuarios?q=${encodeURIComponent(pro.full_name)}`}
              className="text-sm font-medium text-slate-900 hover:text-brand-700 truncate"
            >
              {pro.full_name}
            </Link>
            {isExplorer ? (
              <Badge tone="neutral">
                <Sparkles size={10} className="mr-1" />
                Explorador
              </Badge>
            ) : (
              <Badge tone="success">
                <Crown size={10} className="mr-1" />
                Parceiro
              </Badge>
            )}
            <span className="text-[10px] text-slate-400">
              comissão {pro.commission_rate}%
            </span>
            {isExplorer && atLimit && (
              <Badge tone="danger">
                <AlertCircle size={10} className="mr-1" />
                No limite
              </Badge>
            )}
          </div>

          {isExplorer && (
            <>
              <p className="text-xs text-slate-500 mt-1">
                {pro.monthly_request_count} de {EXPLORER_MONTHLY_LIMIT} requests neste mês
              </p>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[300px]">
                <div
                  className={`h-full ${barColor} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 flex flex-col gap-2 min-w-[260px]">
          {isExplorer ? (
            <form action={forceUpgrade}>
              <input type="hidden" name="profileId" value={pro.id} />
              <input type="hidden" name="userId" value={pro.user_id} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md"
              >
                <ArrowUpRight size={13} />
                Forçar upgrade p/ Parceiro
              </button>
            </form>
          ) : (
            <form action={cancelSubscription} className="flex gap-1.5">
              <input type="hidden" name="profileId" value={pro.id} />
              <input type="hidden" name="userId" value={pro.user_id} />
              <input
                name="reason"
                placeholder="Motivo do cancelamento"
                required
                className="flex-1 px-2 py-2 text-[11px] rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-white bg-slate-700 hover:bg-slate-800 rounded-md whitespace-nowrap"
              >
                <Ban size={12} />
                Cancelar
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

function TabLink({
  current,
  value,
  label,
}: {
  current: Tab;
  value: Tab;
  label: string;
}) {
  const active = current === value;
  const href = value === "near_limit" ? "/planos" : `/planos?tab=${value}`;
  return (
    <Link
      href={href}
      className={
        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
        (active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-slate-600 hover:bg-slate-50 border border-transparent")
      }
    >
      {label}
    </Link>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof CreditCard;
  tone: "brand" | "warning" | "danger" | "neutral";
}) {
  const iconBg = {
    brand: "bg-brand-50 text-brand-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    neutral: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-xl font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${iconBg}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">{hint}</p>
    </div>
  );
}
