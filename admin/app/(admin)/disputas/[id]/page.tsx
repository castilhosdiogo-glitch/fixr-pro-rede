import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  User,
  Briefcase,
  Gavel,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ChatTimeline } from "@/components/ChatTimeline";
import { markInReview, resolveForClient, resolveForProfessional } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDispute(disputeId: string) {
  const supabase = createServiceRoleClient();

  const { data: dispute } = await supabase
    .from("disputes")
    .select("*")
    .eq("id", disputeId)
    .maybeSingle();

  if (!dispute) return null;

  const [serviceRes, messagesRes, paymentRes] = await Promise.all([
    supabase
      .from("service_requests")
      .select("*")
      .eq("id", dispute.service_request_id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, tipo, arquivo_url, duracao, created_at")
      .eq("service_request_id", dispute.service_request_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("amount_paid_cents, status")
      .eq("service_request_id", dispute.service_request_id)
      .maybeSingle(),
  ]);

  const service = serviceRes.data;
  if (!service) return null;

  const userIds = [service.client_id, service.professional_id, dispute.raised_by];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, phone")
    .in("user_id", userIds);

  const nameMap: Record<string, string> = {};
  const phoneMap: Record<string, string> = {};
  for (const p of profiles ?? []) {
    nameMap[p.user_id] = p.full_name ?? "(sem nome)";
    if (p.phone) phoneMap[p.user_id] = p.phone;
  }

  return {
    dispute,
    service,
    messages: messagesRes.data ?? [],
    payment: paymentRes.data,
    nameMap,
    phoneMap,
  };
}

export default async function DisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDispute(id);
  if (!result) notFound();

  const { dispute, service, messages, nameMap, phoneMap } = result;
  const isResolved =
    dispute.status === "resolved_client" || dispute.status === "resolved_professional";

  return (
    <div className="space-y-5">
      <Link
        href="/disputas"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={13} />
        Voltar para disputas
      </Link>

      <header className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <Gavel size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight">{dispute.reason}</h1>
              <DisputeBadge status={dispute.status} />
            </div>
            {dispute.description && (
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                {dispute.description}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-3">
              Aberta por <strong className="text-slate-700">{nameMap[dispute.raised_by] ?? "—"}</strong>{" "}
              em {formatDateTime(dispute.created_at)}
            </p>
            {dispute.resolved_at && (
              <p className="text-xs text-slate-500 mt-1">
                Resolvida em {formatDateTime(dispute.resolved_at)}
                {dispute.resolution_note && (
                  <span className="block mt-1 text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2">
                    <strong>Nota:</strong> {dispute.resolution_note}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <PartyCard
          tone="client"
          name={nameMap[service.client_id] ?? "—"}
          phone={phoneMap[service.client_id]}
          userId={service.client_id}
          isRaiser={dispute.raised_by === service.client_id}
        />
        <PartyCard
          tone="professional"
          name={nameMap[service.professional_id] ?? "—"}
          phone={phoneMap[service.professional_id]}
          userId={service.professional_id}
          isRaiser={dispute.raised_by === service.professional_id}
        />
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Serviço</h2>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">
          {service.description ?? "—"}
        </p>
        <Link
          href={`/servicos/${service.id}`}
          className="inline-block mt-3 text-xs text-brand-600 hover:text-brand-700"
        >
          Abrir serviço completo →
        </Link>
      </section>

      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <MessageCircle size={14} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Conversa entre as partes ({messages.length})
          </h2>
        </div>
        <div className="p-5 max-h-[500px] overflow-y-auto">
          <ChatTimeline
            messages={messages}
            nameMap={nameMap}
            clientId={service.client_id}
          />
        </div>
      </section>

      {!isResolved && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Mediação</h2>

          {dispute.status === "open" && (
            <form action={markInReview} className="mb-4">
              <input type="hidden" name="disputeId" value={dispute.id} />
              <button
                type="submit"
                className="text-xs px-3 py-2 rounded-md border border-slate-300 hover:bg-slate-50"
              >
                Marcar como em análise
              </button>
            </form>
          )}

          <div className="space-y-3">
            <ResolveForm
              action={resolveForClient}
              disputeId={dispute.id}
              serviceRequestId={service.id}
              tone="client"
              label="Resolver a favor do cliente"
            />
            <ResolveForm
              action={resolveForProfessional}
              disputeId={dispute.id}
              serviceRequestId={service.id}
              tone="professional"
              label="Resolver a favor do profissional"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function DisputeBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "warning" | "info" | "success" | "danger" | "neutral"; label: string }> = {
    open: { tone: "warning", label: "Aberta" },
    in_review: { tone: "info", label: "Em análise" },
    resolved_client: { tone: "success", label: "Resolvida (cliente)" },
    resolved_professional: { tone: "success", label: "Resolvida (profissional)" },
    cancelled: { tone: "neutral", label: "Cancelada" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

function PartyCard({
  tone,
  name,
  phone,
  userId: _userId,
  isRaiser,
}: {
  tone: "client" | "professional";
  name: string;
  phone?: string;
  userId: string;
  isRaiser: boolean;
}) {
  const Icon = tone === "client" ? User : Briefcase;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400 mb-2">
        <Icon size={11} />
        {tone === "client" ? "Cliente" : "Profissional"}
        {isRaiser && (
          <Badge tone="warning" className="ml-1">
            <AlertTriangle size={9} className="mr-1" />
            Abriu disputa
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium text-slate-900">{name}</p>
      {phone && <p className="text-xs text-slate-500 mt-1">{phone}</p>}
    </div>
  );
}

function ResolveForm({
  action,
  disputeId,
  serviceRequestId,
  tone,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  disputeId: string;
  serviceRequestId: string;
  tone: "client" | "professional";
  label: string;
}) {
  const btnClass =
    tone === "client"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-brand-600 hover:bg-brand-700";
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="serviceRequestId" value={serviceRequestId} />
      <input
        name="note"
        placeholder="Nota da decisão (opcional, fica no audit log)"
        className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        type="submit"
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white rounded-md whitespace-nowrap ${btnClass}`}
      >
        <CheckCircle2 size={13} />
        {label}
      </button>
    </form>
  );
}
