import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Briefcase,
  MapPin,
  Phone,
  Calendar,
  FileText,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { approveKyc, rejectKyc, suspendUser, unsuspendUser } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserDetails(profileId: string) {
  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;

  const [prof, kyc, authUser] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("*")
      .eq("user_id", profile.user_id)
      .maybeSingle(),
    supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", profile.user_id)
      .maybeSingle(),
    supabase.auth.admin.getUserById(profile.user_id),
  ]);

  return {
    profile,
    professional: prof.data,
    kyc: kyc.data,
    email: authUser.data?.user?.email ?? null,
  };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const details = await getUserDetails(id);
  if (!details) notFound();

  const { profile, professional, kyc, email } = details;
  const isSuspended = !!profile.suspended_at;

  return (
    <div className="space-y-5">
      <Link
        href="/usuarios"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={13} />
        Voltar para usuários
      </Link>

      <header className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            {profile.user_type === "professional" ? (
              <Briefcase size={18} />
            ) : (
              <User size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight">
                {profile.full_name ?? "(sem nome)"}
              </h1>
              <Badge tone={profile.user_type === "professional" ? "info" : "neutral"}>
                {profile.user_type === "professional" ? "Profissional" : "Cliente"}
              </Badge>
              {profile.role === "admin" && <Badge tone="info">Admin</Badge>}
              {profile.role === "superadmin" && <Badge tone="danger">Superadmin</Badge>}
              {isSuspended && (
                <Badge tone="danger">
                  <ShieldAlert size={10} className="mr-1" />
                  Suspenso
                </Badge>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-xs text-slate-600">
              {email && (
                <InfoItem icon={FileText} label="E-mail" value={email} />
              )}
              {profile.phone && (
                <InfoItem icon={Phone} label="Telefone" value={profile.phone} />
              )}
              {profile.city && (
                <InfoItem
                  icon={MapPin}
                  label="Localização"
                  value={`${profile.city}${profile.state ? `/${profile.state}` : ""}`}
                />
              )}
              <InfoItem
                icon={Calendar}
                label="Cadastro"
                value={formatDateTime(profile.created_at)}
              />
            </div>
          </div>
        </div>
      </header>

      {professional && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Perfil profissional</h2>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <InfoBlock label="Categoria" value={professional.category_name} />
            <InfoBlock
              label="Plano"
              value={(professional.plan_name ?? professional.plan ?? "—").toString().toUpperCase()}
            />
            <InfoBlock
              label="Verificado"
              value={professional.verified ? "Sim" : "Não"}
            />
            <InfoBlock
              label="Avaliação"
              value={
                professional.rating
                  ? `${Number(professional.rating).toFixed(1)} (${professional.review_count ?? 0})`
                  : "—"
              }
            />
          </div>
          {professional.description && (
            <p className="mt-4 text-sm text-slate-600">{professional.description}</p>
          )}
        </section>
      )}

      {kyc && (
        <section className="bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Verificação de documento</h2>
            <Badge
              tone={
                kyc.status === "approved"
                  ? "success"
                  : kyc.status === "rejected"
                    ? "danger"
                    : "warning"
              }
            >
              {kyc.status}
            </Badge>
          </div>
          <div className="px-5 py-4 grid grid-cols-3 gap-4 text-xs">
            <InfoBlock label="Nome legal" value={kyc.full_legal_name} />
            <InfoBlock label="Documento" value={kyc.document_type?.toUpperCase()} />
            <InfoBlock label="Número" value={kyc.document_number} />
            <InfoBlock label="Enviado" value={formatDateTime(kyc.submitted_at)} />
            {kyc.reviewed_at && (
              <InfoBlock label="Revisado" value={formatDateTime(kyc.reviewed_at)} />
            )}
            {kyc.rejection_reason && (
              <InfoBlock label="Motivo rejeição" value={kyc.rejection_reason} />
            )}
          </div>
          {(kyc.status === "pending" || kyc.status === "under_review") && (
            <div className="px-5 py-4 border-t border-slate-200 space-y-3">
              <form action={approveKyc} className="flex gap-2">
                <input type="hidden" name="kycId" value={kyc.id} />
                <input type="hidden" name="userId" value={profile.user_id} />
                <input type="hidden" name="profileId" value={profile.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                >
                  <CheckCircle2 size={13} />
                  Aprovar
                </button>
              </form>
              <form action={rejectKyc} className="flex gap-2">
                <input type="hidden" name="kycId" value={kyc.id} />
                <input type="hidden" name="userId" value={profile.user_id} />
                <input type="hidden" name="profileId" value={profile.id} />
                <input
                  name="reason"
                  required
                  placeholder="Motivo da rejeição (será enviado ao usuário)"
                  className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md"
                >
                  <XCircle size={13} />
                  Rejeitar
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Ações administrativas</h2>
        {isSuspended ? (
          <div className="space-y-3">
            <div className="text-xs text-slate-600 bg-red-50 border border-red-200 rounded-md p-3">
              Suspenso em {formatDateTime(profile.suspended_at)}
              {profile.suspended_reason && (
                <span className="block mt-1 text-slate-700">
                  Motivo: {profile.suspended_reason}
                </span>
              )}
            </div>
            <form action={unsuspendUser}>
              <input type="hidden" name="profileId" value={profile.id} />
              <input type="hidden" name="userId" value={profile.user_id} />
              <button
                type="submit"
                className="px-3 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
              >
                Reativar usuário
              </button>
            </form>
          </div>
        ) : (
          <form action={suspendUser} className="flex gap-2">
            <input type="hidden" name="profileId" value={profile.id} />
            <input type="hidden" name="userId" value={profile.user_id} />
            <input
              name="reason"
              required
              placeholder="Motivo da suspensão"
              className="flex-1 px-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              <ShieldAlert size={13} />
              Suspender
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-slate-700 truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-slate-800 font-medium mt-1">{value ?? "—"}</p>
    </div>
  );
}
