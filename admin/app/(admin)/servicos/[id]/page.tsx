import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Briefcase,
  Calendar,
  MessageCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatDateTime, formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { ChatTimeline } from "@/components/ChatTimeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getService(serviceId: string) {
  const supabase = createServiceRoleClient();

  const { data: service } = await supabase
    .from("service_requests")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service) return null;

  const [messagesRes, paymentRes, profilesRes, disputeRes] = await Promise.all([
    supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, tipo, arquivo_url, duracao, created_at")
      .eq("service_request_id", serviceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("service_request_id", serviceId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("user_id, full_name, phone, city, state")
      .in("user_id", [service.client_id, service.professional_id]),
    supabase
      .from("disputes")
      .select("*")
      .eq("service_request_id", serviceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const nameMap: Record<string, string> = {};
  const infoMap: Record<string, { phone?: string; city?: string; state?: string }> = {};
  for (const p of profilesRes.data ?? []) {
    nameMap[p.user_id] = p.full_name ?? "(sem nome)";
    infoMap[p.user_id] = {
      phone: p.phone ?? undefined,
      city: p.city ?? undefined,
      state: p.state ?? undefined,
    };
  }

  return {
    service,
    messages: messagesRes.data ?? [],
    payment: paymentRes.data,
    nameMap,
    infoMap,
    dispute: disputeRes.data,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getService(id);
  if (!result) notFound();

  const { service, messages, payment, nameMap, infoMap, dispute } = result;

  return (
    <div className="space-y-5">
      <Link
        href="/servicos"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={13} />
        Voltar para serviços
      </Link>

      <header className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-xl font-semibold tracking-tight">Serviço</h1>
              <Badge tone="neutral">{service.status ?? "—"}</Badge>
              {dispute && dispute.status !== "resolved_client" && dispute.status !== "resolved_professional" && (
                <Link href={`/disputas/${dispute.id}`}>
                  <Badge tone="danger">
                    <AlertTriangle size={10} className="mr-1" />
                    Em disputa
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {service.description ?? "—"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            <div>Criado</div>
            <div className="text-slate-700">{formatDateTime(service.created_at)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-4 text-xs">
          <Info label="Cliente" icon={User}>
            <Link
              href={`/usuarios?q=${encodeURIComponent(nameMap[service.client_id] ?? "")}`}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              {nameMap[service.client_id] ?? "—"}
            </Link>
            {infoMap[service.client_id]?.phone && (
              <span className="block text-slate-500 mt-0.5">
                {infoMap[service.client_id].phone}
              </span>
            )}
          </Info>
          <Info label="Profissional" icon={Briefcase}>
            <Link
              href={`/usuarios?q=${encodeURIComponent(nameMap[service.professional_id] ?? "")}`}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              {nameMap[service.professional_id] ?? "—"}
            </Link>
          </Info>
          {service.scheduled_date && (
            <Info label="Agendado" icon={Calendar}>
              <span className="text-slate-700">
                {formatDateTime(service.scheduled_date)}
              </span>
            </Info>
          )}
          {payment && (
            <Info label="Pagamento" icon={Wallet}>
              <span className="text-slate-700">
                {formatBRL((payment.amount_paid_cents ?? 0) / 100)}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">
                {payment.status}
              </span>
            </Info>
          )}
        </div>
      </header>

      <section className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <MessageCircle size={14} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Chat ({messages.length})
          </h2>
        </div>
        <div className="p-5">
          <ChatTimeline
            messages={messages}
            nameMap={nameMap}
            clientId={service.client_id}
          />
        </div>
      </section>
    </div>
  );
}

function Info({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 mb-1">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-slate-700 text-sm">{children}</div>
    </div>
  );
}
