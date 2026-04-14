import Link from "next/link";
import { Gavel, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Filter = "open" | "in_review" | "resolved" | "all";

const PAGE_SIZE = 25;

async function fetchDisputes({ filter, page }: { filter: Filter; page: number }) {
  const supabase = createServiceRoleClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("disputes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter === "open") query = query.eq("status", "open");
  if (filter === "in_review") query = query.eq("status", "in_review");
  if (filter === "resolved") {
    query = query.in("status", ["resolved_client", "resolved_professional"]);
  }

  const { data, count } = await query;
  const disputes = data ?? [];

  const srIds = disputes.map((d) => d.service_request_id);
  const userIds = new Set<string>();
  for (const d of disputes) userIds.add(d.raised_by);

  const servicesRes = srIds.length
    ? await supabase
        .from("service_requests")
        .select("id, description, client_id, professional_id")
        .in("id", srIds)
    : { data: [] as { id: string; description: string | null; client_id: string; professional_id: string }[] };

  for (const s of servicesRes.data ?? []) {
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

  const serviceMap: Record<
    string,
    { description: string | null; client_id: string; professional_id: string }
  > = {};
  for (const s of servicesRes.data ?? []) {
    serviceMap[s.id] = {
      description: s.description,
      client_id: s.client_id,
      professional_id: s.professional_id,
    };
  }

  return { disputes, nameMap, serviceMap, total: count ?? 0 };
}

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: Filter; page?: string }>;
}) {
  const params = await searchParams;
  const filter = (params.filter ?? "open") as Filter;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { disputes, nameMap, serviceMap, total } = await fetchDisputes({ filter, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Disputas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Fila de mediação entre clientes e profissionais.
        </p>
      </header>

      <nav className="flex items-center gap-1 flex-wrap">
        <FilterLink current={filter} value="open" label="Abertas" />
        <FilterLink current={filter} value="in_review" label="Em análise" />
        <FilterLink current={filter} value="resolved" label="Resolvidas" />
        <FilterLink current={filter} value="all" label="Todas" />
      </nav>

      <section className="bg-white rounded-xl border border-slate-200">
        {disputes.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhuma disputa nessa categoria.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {disputes.map((d) => {
              const svc = serviceMap[d.service_request_id];
              return (
                <li key={d.id}>
                  <Link
                    href={`/disputas/${d.id}`}
                    className="block px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                        <Gavel size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {d.reason}
                          </p>
                          <DisputeStatus status={d.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Aberta por: {nameMap[d.raised_by] ?? "—"}
                          {svc && (
                            <>
                              {" "}
                              · Cliente: {nameMap[svc.client_id] ?? "—"}
                              {" "}· Profissional: {nameMap[svc.professional_id] ?? "—"}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">
                        {timeAgo(d.created_at)}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Página {page} de {totalPages} · {total.toLocaleString("pt-BR")} disputas
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ filter, page: page - 1 })}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ filter, page: page + 1 })}
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

function DisputeStatus({ status }: { status: string }) {
  const map: Record<string, { tone: "warning" | "info" | "success" | "danger" | "neutral"; label: string; icon: typeof AlertTriangle }> = {
    open: { tone: "warning", label: "Aberta", icon: AlertTriangle },
    in_review: { tone: "info", label: "Em análise", icon: Gavel },
    resolved_client: { tone: "success", label: "Favor cliente", icon: CheckCircle2 },
    resolved_professional: { tone: "success", label: "Favor profissional", icon: CheckCircle2 },
    cancelled: { tone: "neutral", label: "Cancelada", icon: XCircle },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status, icon: AlertTriangle };
  const Icon = entry.icon;
  return (
    <Badge tone={entry.tone}>
      <Icon size={10} className="mr-1" />
      {entry.label}
    </Badge>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current: Filter;
  value: Filter;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={buildHref({ filter: value, page: 1 })}
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

function buildHref({ filter, page }: { filter: Filter; page: number }) {
  const params = new URLSearchParams();
  if (filter !== "open") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/disputas?${qs}` : "/disputas";
}
