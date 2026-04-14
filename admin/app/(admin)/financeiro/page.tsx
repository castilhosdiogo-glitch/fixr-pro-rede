import Link from "next/link";
import {
  Wallet,
  Clock,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatBRL, formatDateTime, timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { releaseEscrow, holdEscrow, refundPayment } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tab = "pending" | "held" | "refunded";

const ESCROW_WINDOW_MS = 48 * 60 * 60 * 1000;

type PaymentRow = {
  id: string;
  service_request_id: string;
  client_id: string;
  professional_id: string;
  amount_paid_cents: number;
  commission_amount_cents: number;
  status: string;
  escrow_status: string;
  escrow_hold_reason: string | null;
  escrow_hold_at: string | null;
  escrow_released_at: string | null;
  refund_reason: string | null;
  refunded_at: string | null;
  created_at: string;
};

async function fetchTotals() {
  const supabase = createServiceRoleClient();

  const { data: holding } = await supabase
    .from("payments")
    .select("amount_paid_cents, commission_amount_cents")
    .eq("status", "succeeded")
    .eq("escrow_status", "holding");

  const { data: held } = await supabase
    .from("payments")
    .select("amount_paid_cents, commission_amount_cents")
    .eq("status", "succeeded")
    .eq("escrow_status", "held_by_admin");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: refunds } = await supabase
    .from("payments")
    .select("amount_paid_cents")
    .eq("escrow_status", "refunded")
    .gte("refunded_at", startOfMonth.toISOString());

  const sumAmt = (rows: { amount_paid_cents: number }[] | null) =>
    (rows ?? []).reduce((a, r) => a + (r.amount_paid_cents ?? 0), 0);
  const sumCommission = (rows: { commission_amount_cents: number }[] | null) =>
    (rows ?? []).reduce((a, r) => a + (r.commission_amount_cents ?? 0), 0);

  const now = Date.now();
  const eligibleHolding = (holding ?? []).length;

  return {
    escrowTotalCents: sumAmt(holding) + sumAmt(held),
    pendingReleaseCount: eligibleHolding,
    heldCount: (held ?? []).length,
    refundsMonthCents: sumAmt(refunds),
    refundsMonthCount: (refunds ?? []).length,
    commissionInEscrow: sumCommission(holding),
    _now: now,
  };
}

async function fetchPayments(tab: Tab): Promise<PaymentRow[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("payments")
    .select(
      "id, service_request_id, client_id, professional_id, amount_paid_cents, commission_amount_cents, status, escrow_status, escrow_hold_reason, escrow_hold_at, escrow_released_at, refund_reason, refunded_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (tab === "pending") {
    query = query.eq("status", "succeeded").eq("escrow_status", "holding");
  } else if (tab === "held") {
    query = query.eq("escrow_status", "held_by_admin");
  } else {
    query = query.eq("escrow_status", "refunded");
  }

  const { data } = await query;
  return data ?? [];
}

async function fetchNames(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);
  const map: Record<string, string> = {};
  for (const p of data ?? []) map[p.user_id] = p.full_name ?? "(sem nome)";
  return map;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const params = await searchParams;
  const tab = (params.tab ?? "pending") as Tab;

  const [totals, payments] = await Promise.all([fetchTotals(), fetchPayments(tab)]);

  const userIds = new Set<string>();
  for (const p of payments) {
    userIds.add(p.client_id);
    userIds.add(p.professional_id);
  }
  const nameMap = await fetchNames(Array.from(userIds));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-1">
          Escrow, liberações e reembolsos. Liberação automática após 48h.
        </p>
      </header>

      <section className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Saldo em escrow"
          value={formatBRL(totals.escrowTotalCents / 100)}
          hint={`Comissão retida: ${formatBRL(totals.commissionInEscrow / 100)}`}
          icon={Wallet}
          tone="brand"
        />
        <KpiCard
          label="Aguardando liberação"
          value={totals.pendingReleaseCount.toString()}
          hint="Pagamentos succeeded em holding"
          icon={Clock}
          tone="warning"
        />
        <KpiCard
          label="Em espera manual"
          value={totals.heldCount.toString()}
          hint="Retidos por admin"
          icon={ShieldAlert}
          tone="danger"
        />
        <KpiCard
          label="Reembolsos (mês)"
          value={formatBRL(totals.refundsMonthCents / 100)}
          hint={`${totals.refundsMonthCount} operações`}
          icon={RotateCcw}
          tone="neutral"
        />
      </section>

      <nav className="flex items-center gap-1 flex-wrap">
        <TabLink current={tab} value="pending" label="Aguardando liberação" />
        <TabLink current={tab} value="held" label="Em espera" />
        <TabLink current={tab} value="refunded" label="Reembolsos" />
      </nav>

      <section className="bg-white rounded-xl border border-slate-200">
        {payments.length === 0 ? (
          <p className="px-5 py-12 text-sm text-slate-500 text-center">
            Nenhum pagamento nessa categoria.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {payments.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                tab={tab}
                clientName={nameMap[p.client_id]}
                professionalName={nameMap[p.professional_id]}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PaymentRow({
  payment,
  tab,
  clientName,
  professionalName,
}: {
  payment: PaymentRow;
  tab: Tab;
  clientName?: string;
  professionalName?: string;
}) {
  const elapsed = Date.now() - new Date(payment.created_at).getTime();
  const readyToRelease = elapsed >= ESCROW_WINDOW_MS;
  const hoursLeft = Math.max(0, Math.ceil((ESCROW_WINDOW_MS - elapsed) / (60 * 60 * 1000)));

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {formatBRL((payment.amount_paid_cents ?? 0) / 100)}
            </span>
            <EscrowBadge status={payment.escrow_status} />
            {tab === "pending" && (
              readyToRelease ? (
                <Badge tone="success">
                  <CheckCircle2 size={10} className="mr-1" />
                  Pronto p/ liberar
                </Badge>
              ) : (
                <Badge tone="warning">
                  <Clock size={10} className="mr-1" />
                  {hoursLeft}h restantes
                </Badge>
              )
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            Cliente: <span className="text-slate-700">{clientName ?? "—"}</span>
            {" · "}
            Profissional: <span className="text-slate-700">{professionalName ?? "—"}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Comissão: {formatBRL((payment.commission_amount_cents ?? 0) / 100)}
            {" · "}
            Criado {timeAgo(payment.created_at)}
            {payment.escrow_hold_at && (
              <> · Retido em {formatDateTime(payment.escrow_hold_at)}</>
            )}
            {payment.refunded_at && (
              <> · Reembolsado em {formatDateTime(payment.refunded_at)}</>
            )}
            {payment.escrow_released_at && (
              <> · Liberado em {formatDateTime(payment.escrow_released_at)}</>
            )}
          </p>
          {payment.escrow_hold_reason && (
            <p className="text-xs text-slate-700 bg-amber-50 border border-amber-200 rounded-md p-2 mt-2">
              <strong>Motivo da retenção:</strong> {payment.escrow_hold_reason}
            </p>
          )}
          {payment.refund_reason && (
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2 mt-2">
              <strong>Motivo do reembolso:</strong> {payment.refund_reason}
            </p>
          )}
          <Link
            href={`/servicos/${payment.service_request_id}`}
            className="inline-block text-[11px] text-brand-600 hover:text-brand-700 mt-2"
          >
            Ver serviço →
          </Link>
        </div>

        {tab !== "refunded" && (
          <div className="shrink-0 flex flex-col gap-2 min-w-[260px]">
            <form action={releaseEscrow}>
              <input type="hidden" name="paymentId" value={payment.id} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
              >
                <CheckCircle2 size={13} />
                Liberar agora
              </button>
            </form>
            {tab === "pending" && (
              <InlineReasonForm
                action={holdEscrow}
                paymentId={payment.id}
                buttonLabel="Reter"
                buttonTone="amber"
                placeholder="Motivo da retenção"
                icon={Ban}
              />
            )}
            <InlineReasonForm
              action={refundPayment}
              paymentId={payment.id}
              buttonLabel="Reembolsar"
              buttonTone="slate"
              placeholder="Motivo do reembolso"
              icon={RotateCcw}
            />
          </div>
        )}
      </div>
    </li>
  );
}

function InlineReasonForm({
  action,
  paymentId,
  buttonLabel,
  buttonTone,
  placeholder,
  icon: Icon,
}: {
  action: (formData: FormData) => Promise<void>;
  paymentId: string;
  buttonLabel: string;
  buttonTone: "amber" | "slate";
  placeholder: string;
  icon: typeof Ban;
}) {
  const btn =
    buttonTone === "amber"
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-slate-700 hover:bg-slate-800";
  return (
    <form action={action} className="flex gap-1.5">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input
        name="reason"
        placeholder={placeholder}
        required
        className="flex-1 px-2 py-2 text-[11px] rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        className={`inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-white rounded-md whitespace-nowrap ${btn}`}
      >
        <Icon size={12} />
        {buttonLabel}
      </button>
    </form>
  );
}

function EscrowBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "warning" | "info" | "success" | "danger" | "neutral"; label: string }> = {
    holding: { tone: "warning", label: "Em escrow" },
    released: { tone: "success", label: "Liberado" },
    held_by_admin: { tone: "danger", label: "Retido" },
    refunded: { tone: "neutral", label: "Reembolsado" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
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
  const href = value === "pending" ? "/financeiro" : `/financeiro?tab=${value}`;
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
  icon: typeof Wallet;
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
      <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
        <AlertTriangle size={10} className="text-slate-300" />
        {hint}
      </p>
    </div>
  );
}
