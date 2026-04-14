import { headers } from "next/headers";
import { createClient, createServiceRoleClient } from "./supabase/server";

export type AuditAction =
  | "user.approve_document"
  | "user.suspend"
  | "user.unsuspend"
  | "service.update_status"
  | "finance.release_escrow"
  | "finance.hold_escrow"
  | "finance.refund"
  | "dispute.resolve_client"
  | "dispute.resolve_professional"
  | "fiscal.reprocess_nfse"
  | "plan.force_upgrade"
  | "plan.cancel_subscription"
  | "auth.admin_login"
  | "auth.admin_logout";

export type AuditEntry = {
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(entry: AuditEntry) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("logAudit called without authenticated admin");
  }

  const hdrs = await headers();
  const ipAddress =
    hdrs.get("x-forwarded-for")?.split(",")[0].trim() ??
    hdrs.get("x-real-ip") ??
    null;
  const userAgent = hdrs.get("user-agent") ?? null;

  const service = createServiceRoleClient();
  const { error } = await service.from("admin_audit_log").insert({
    admin_id: user.id,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    console.error("[audit] failed to log", entry.action, error);
  }
}
