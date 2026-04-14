"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  if (!isAdmin) throw new Error("forbidden");

  return user;
}

export async function markInReview(formData: FormData) {
  await requireAdmin();
  const disputeId = String(formData.get("disputeId") ?? "");
  if (!disputeId) return;

  const service = createServiceRoleClient();
  await service
    .from("disputes")
    .update({ status: "in_review" })
    .eq("id", disputeId)
    .eq("status", "open");

  revalidatePath(`/disputas/${disputeId}`);
}

export async function resolveForClient(formData: FormData) {
  const admin = await requireAdmin();
  const disputeId = String(formData.get("disputeId") ?? "");
  const serviceRequestId = String(formData.get("serviceRequestId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!disputeId || !serviceRequestId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("disputes")
    .update({
      status: "resolved_client",
      resolution_note: note || null,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) throw error;

  await logAudit({
    action: "dispute.resolve_client",
    targetType: "dispute",
    targetId: disputeId,
    metadata: { serviceRequestId, note },
  });

  revalidatePath(`/disputas/${disputeId}`);
}

export async function resolveForProfessional(formData: FormData) {
  const admin = await requireAdmin();
  const disputeId = String(formData.get("disputeId") ?? "");
  const serviceRequestId = String(formData.get("serviceRequestId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!disputeId || !serviceRequestId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("disputes")
    .update({
      status: "resolved_professional",
      resolution_note: note || null,
      resolved_by: admin.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);

  if (error) throw error;

  await logAudit({
    action: "dispute.resolve_professional",
    targetType: "dispute",
    targetId: disputeId,
    metadata: { serviceRequestId, note },
  });

  revalidatePath(`/disputas/${disputeId}`);
}
