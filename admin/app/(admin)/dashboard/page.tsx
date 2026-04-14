import { AlertTriangle, TrendingUp, Users, Briefcase, type LucideIcon } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-sm text-slate-500 mt-1">
          Métricas em tempo real e alertas prioritários.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Usuários ativos" value="—" hint="últimas 24h" />
        <MetricCard icon={Briefcase} label="Serviços em aberto" value="—" hint="em atendimento" />
        <MetricCard icon={TrendingUp} label="GMV (7d)" value="—" hint="volume transacionado" />
        <MetricCard icon={AlertTriangle} label="Alertas" value="—" hint="ações pendentes" />
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Fase 1 concluída</h2>
        <p className="text-sm text-slate-500">
          Fundação do admin pronta: auth com role, middleware, layout, audit log. Os módulos
          (Usuários, Serviços, Financeiro, Disputas, Hub Fiscal, Planos) serão construídos nas
          próximas fases.
        </p>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
        <Icon size={16} className="text-slate-400" />
      </div>
      <p className="text-2xl font-semibold mt-2 tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
    </div>
  );
}
