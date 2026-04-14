import Link from "next/link";
import { Briefcase, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StatusFilter =
  | "all"
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "disputed";

const PAGE_SIZE = 25;

type ServiceRow = {
  id: string;
  description: string | null;
  status: string | null;
  client_id: string;
  professional_id: string;
  created_at: string;
  scheduled_date: string | null;
};

async function fetchServices({
  status,
  page,
}: {
  status: StatusFilter;
  page: number;
}) {
  const supabase = createServiceRoleClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (status === "disputed") {
    const { data: disputes } = await supabase
      .from("disputes")
      .select("service_request_id, status, created_at")
      .in("status", ["open", "in_review"])
      .order("created_at", { ascending: false });

    const srIds = (disputes ?? []).map((d) => d.service_request_id);
    if (srIds.length === 0) {
      return { services: [], nameMap: {}, total: 0 };
    }

    const { data, count } = await supabase
      .from("service_requests")
      .select(
        "id, description, status, client_id, professional_id, created_at, scheduled_date",
        { count: "exact" },
      )
      .in("id", srIds)
      .order("created_at", { ascending: false })
      .range(from, to);

    return attachNames(supabase, (data as ServiceRow[]) ?? [], count ?? 0);
  }

  let query = supabase
    .from("service_requests")
    .select(
      "id, description, status, client_id, professional_id, created_at, scheduled_date",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") query = query.eq("status", status);

  const { data, count } = await query;
  return attachNames(supabase, (data as ServiceRow[]) ?? [], count ?? 0);
}

async function attachNames(
  supabase: ReturnType<typeof createServiceRoleClient>,
  services: ServiceRow[],
  total: number,
) {
  const userIds = new Set<string>();
  for (const s of services) {
    userIds.add(s.client_id);
    userIds.add(s.professional_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", Array.from(userIds));

  const nameMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.user_id] = p.full_name ?? "(sem nome)";
  }

  return { services, nameMap, total };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: StatusFilter; page?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status ?? "all") as StatusFilter;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { services, nameMap, total } = await fetchServices({ status, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Serviços</h1>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhamento em tempo real de todos os pedidos.
        </p>
      </header>

      <nav className="flex items-center gap-1 flex-wrap">
        <StatusLink current={status} value="all" label="Todos" />
        <StatusLink current={status} value="pending" label="Pendentes" />
        <StatusLink current={status} value="accepted" label="Aceitos" />
        <StatusLink current={status} value="in_progress" label="Em andamento" />
        <StatusLink current={status} value="completed" label="Concluídos" />
        <StatusLink current={status} value="cancelled" label="Cancelados" />
        <StatusLink current={status} value="disputed" label="Em disputa" />
      </nav>

      <section className="bg-white rounded-xl border border-slate-200">
        {services.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhum serviço encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/servicos/${s.id}`}
                  className="block px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <Briefcase size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {s.description?.slice(0, 80) ?? "(sem descrição)"}
                          {s.description && s.description.length > 80 ? "..." : ""}
                        </p>
                        <StatusBadge status={s.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        Cliente: {nameMap[s.client_id] ?? "—"} · Profissional:{" "}
                        {nameMap[s.professional_id] ?? "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{timeAgo(s.created_at)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} serviços
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ status, page: page - 1 })}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ status, page: page + 1 })}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusLink({
  current,
  value,
  label,
}: {
  current: StatusFilter;
  value: StatusFilter;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={buildHref({ status: value, page: 1 })}
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

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge tone="neutral">—</Badge>;
  const map: Record<string, { tone: "info" | "warning" | "success" | "danger" | "neutral"; label: string; icon: typeof Clock }> = {
    pending: { tone: "warning", label: "Pendente", icon: Clock },
    accepted: { tone: "info", label: "Aceito", icon: CheckCircle2 },
    in_progress: { tone: "info", label: "Em andamento", icon: Clock },
    completed: { tone: "success", label: "Concluído", icon: CheckCircle2 },
    cancelled: { tone: "neutral", label: "Cancelado", icon: XCircle },
    disputed: { tone: "danger", label: "Disputa", icon: AlertTriangle },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status, icon: Clock };
  const Icon = entry.icon;
  return (
    <Badge tone={entry.tone}>
      <Icon size={10} className="mr-1" />
      {entry.label}
    </Badge>
  );
}

function buildHref({
  status,
  page,
}: {
  status: StatusFilter;
  page: number;
}) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/servicos?${qs}` : "/servicos";
}
