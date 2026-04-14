import Link from "next/link";
import { Search, User, Briefcase, ShieldAlert } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Filter = "all" | "clients" | "professionals" | "suspended" | "kyc_pending";

const PAGE_SIZE = 25;

async function fetchUsers({
  q,
  filter,
  page,
}: {
  q: string;
  filter: Filter;
  page: number;
}) {
  const supabase = createServiceRoleClient();
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, user_id, full_name, user_type, phone, city, state, role, suspended_at, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filter === "clients") query = query.eq("user_type", "client");
  if (filter === "professionals") query = query.eq("user_type", "professional");
  if (filter === "suspended") query = query.not("suspended_at", "is", null);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,city.ilike.%${q}%,phone.ilike.%${q}%`);
  }

  const { data, count } = await query;

  let users = data ?? [];

  if (filter === "kyc_pending") {
    const { data: kycUsers } = await supabase
      .from("kyc_submissions")
      .select("user_id")
      .in("status", ["pending", "under_review"]);
    const userIds = new Set((kycUsers ?? []).map((k) => k.user_id));
    users = users.filter((u) => userIds.has(u.user_id));
  }

  return { users, total: count ?? 0 };
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: Filter; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const filter = (params.filter ?? "all") as Filter;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const { users, total } = await fetchUsers({ q, filter, page });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-slate-500 mt-1">
            {total.toLocaleString("pt-BR")} {total === 1 ? "usuário" : "usuários"}
          </p>
        </div>
      </header>

      <section className="bg-white rounded-xl border border-slate-200">
        <form
          method="get"
          className="px-4 py-3 border-b border-slate-200 flex items-center gap-3"
        >
          <input type="hidden" name="filter" value={filter} />
          <div className="relative flex-1 max-w-md">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome, cidade ou telefone"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 text-xs font-medium rounded-md border border-slate-300 hover:bg-slate-50"
          >
            Buscar
          </button>
          <nav className="flex items-center gap-1 ml-auto">
            <FilterLink current={filter} value="all" label="Todos" q={q} />
            <FilterLink current={filter} value="clients" label="Clientes" q={q} />
            <FilterLink
              current={filter}
              value="professionals"
              label="Profissionais"
              q={q}
            />
            <FilterLink
              current={filter}
              value="kyc_pending"
              label="KYC pendente"
              q={q}
            />
            <FilterLink current={filter} value="suspended" label="Suspensos" q={q} />
          </nav>
        </form>

        {users.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/usuarios/${u.id}`}
                  className="block px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                      {u.user_type === "professional" ? (
                        <Briefcase size={14} />
                      ) : (
                        <User size={14} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.full_name ?? "(sem nome)"}
                        </p>
                        {u.role === "admin" && <Badge tone="info">Admin</Badge>}
                        {u.role === "superadmin" && (
                          <Badge tone="danger">Superadmin</Badge>
                        )}
                        {u.suspended_at && (
                          <Badge tone="danger">
                            <ShieldAlert size={10} className="mr-1" />
                            Suspenso
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {u.user_type === "professional" ? "Profissional" : "Cliente"}
                        {u.city ? ` · ${u.city}${u.state ? `/${u.state}` : ""}` : ""}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">{timeAgo(u.created_at)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildHref({ q, filter, page: page - 1 })}
                  className="px-2 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildHref({ q, filter, page: page + 1 })}
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

function FilterLink({
  current,
  value,
  label,
  q,
}: {
  current: Filter;
  value: Filter;
  label: string;
  q: string;
}) {
  const active = current === value;
  return (
    <Link
      href={buildHref({ q, filter: value, page: 1 })}
      className={
        "px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-colors " +
        (active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-slate-600 hover:bg-slate-50 border border-transparent")
      }
    >
      {label}
    </Link>
  );
}

function buildHref({
  q,
  filter,
  page,
}: {
  q: string;
  filter: Filter;
  page: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/usuarios?${qs}` : "/usuarios";
}
