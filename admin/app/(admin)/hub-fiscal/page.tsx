import Link from "next/link";
import {
  Receipt,
  AlertTriangle,
  TrendingUp,
  FileWarning,
  Calendar,
  Info,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MEI_ANNUAL_LIMIT = 81000;

type MeiRow = {
  professional_id: string;
  user_id: string;
  full_name: string;
  ytd_revenue: number;
  usage_pct: number;
};

async function fetchMeiUsage(): Promise<MeiRow[]> {
  const supabase = createServiceRoleClient();
  const startOfYear = new Date();
  startOfYear.setMonth(0, 1);
  startOfYear.setHours(0, 0, 0, 0);

  const { data: revenue } = await supabase
    .from("mei_revenue_tracking")
    .select("professional_id, revenue, month")
    .gte("month", startOfYear.toISOString().slice(0, 10));

  const byPro: Record<string, number> = {};
  for (const r of revenue ?? []) {
    byPro[r.professional_id] = (byPro[r.professional_id] ?? 0) + Number(r.revenue ?? 0);
  }

  const proIds = Object.keys(byPro);
  if (proIds.length === 0) return [];

  const { data: pros } = await supabase
    .from("professional_profiles")
    .select("id, user_id")
    .in("id", proIds);

  const userIds = (pros ?? []).map((p) => p.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) nameMap[p.user_id] = p.full_name ?? "(sem nome)";

  const rows: MeiRow[] = (pros ?? []).map((p) => {
    const ytd = byPro[p.id] ?? 0;
    return {
      professional_id: p.id,
      user_id: p.user_id,
      full_name: nameMap[p.user_id] ?? "(sem nome)",
      ytd_revenue: ytd,
      usage_pct: (ytd / MEI_ANNUAL_LIMIT) * 100,
    };
  });

  rows.sort((a, b) => b.usage_pct - a.usage_pct);
  return rows;
}

export default async function HubFiscalPage() {
  const meiRows = await fetchMeiUsage();
  const critical = meiRows.filter((r) => r.usage_pct >= 90);
  const warning = meiRows.filter((r) => r.usage_pct >= 70 && r.usage_pct < 90);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hub Fiscal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitoramento de MEI, NFS-e e DAS dos profissionais.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <KpiCard
          label="MEI crítico (≥90%)"
          value={critical.length.toString()}
          hint={`Limite anual: ${formatBRL(MEI_ANNUAL_LIMIT)}`}
          icon={AlertTriangle}
          tone="danger"
        />
        <KpiCard
          label="MEI atenção (70–89%)"
          value={warning.length.toString()}
          hint="Próximos de estourar o teto"
          icon={TrendingUp}
          tone="warning"
        />
        <KpiCard
          label="Rastreados"
          value={meiRows.length.toString()}
          hint="MEIs com receita lançada"
          icon={Receipt}
          tone="brand"
        />
      </section>

      <section className="bg-white rounded-xl border border-slate-200">
        <header className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Receipt size={14} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Limite MEI (ano corrente)</h2>
        </header>
        {meiRows.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhum profissional com receita MEI lançada neste ano.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {meiRows.slice(0, 30).map((row) => (
              <MeiRowItem key={row.professional_id} row={row} />
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4">
        <PlaceholderCard
          icon={FileWarning}
          title="NFS-e com erro"
          description="Integração com prefeituras (webservice ABRASF) ainda não implementada. Quando ativa, erros de emissão ficarão aqui para reprocessamento."
        />
        <PlaceholderCard
          icon={Calendar}
          title="DAS — guias em atraso"
          description="Integração com Receita Federal pendente. A lista de profissionais com DAS em atraso aparecerá aqui."
        />
      </section>
    </div>
  );
}

function MeiRowItem({ row }: { row: MeiRow }) {
  const pct = Math.min(100, row.usage_pct);
  const tone =
    pct >= 100 ? "danger" : pct >= 90 ? "danger" : pct >= 70 ? "warning" : "neutral";
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/usuarios?q=${encodeURIComponent(row.full_name)}`}
              className="text-sm font-medium text-slate-900 hover:text-brand-700 truncate"
            >
              {row.full_name}
            </Link>
            <Badge tone={tone}>
              {pct >= 100 ? "Estourado" : `${pct.toFixed(0)}%`}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {formatBRL(row.ytd_revenue)} de {formatBRL(MEI_ANNUAL_LIMIT)}
          </p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${barColor} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function PlaceholderCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileWarning;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
          <Icon size={16} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <Badge tone="neutral">Em breve</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed flex items-start gap-1">
            <Info size={11} className="text-slate-400 mt-0.5 shrink-0" />
            {description}
          </p>
        </div>
      </div>
    </div>
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
  icon: typeof Receipt;
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
