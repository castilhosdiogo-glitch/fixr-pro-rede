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

export async function approveKyc(formData: FormData) {
  const admin = await requireAdmin();
  const kycId = String(formData.get("kycId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!kycId || !userId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("kyc_submissions")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", kycId);

  if (error) throw error;

  await logAudit({
    action: "user.approve_document",
    targetType: "kyc_submission",
    targetId: kycId,
    metadata: { userId },
  });

  revalidatePath(`/usuarios/${formData.get("profileId")}`);
}

export async function rejectKyc(formData: FormData) {
  const admin = await requireAdmin();
  const kycId = String(formData.get("kycId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!kycId || !userId || !reason) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("kyc_submissions")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", kycId);

  if (error) throw error;

  await logAudit({
    action: "user.approve_document",
    targetType: "kyc_submission",
    targetId: kycId,
    metadata: { userId, decision: "rejected", reason },
  });

  revalidatePath(`/usuarios/${formData.get("profileId")}`);
}

export async function suspendUser(formData: FormData) {
  const admin = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!profileId || !userId || !reason) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("profiles")
    .update({
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
      suspended_by: admin.id,
    })
    .eq("id", profileId);

  if (error) throw error;

  await logAudit({
    action: "user.suspend",
    targetType: "profile",
    targetId: profileId,
    metadata: { userId, reason },
  });

  revalidatePath(`/usuarios/${profileId}`);
}

export async function unsuspendUser(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!profileId || !userId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("profiles")
    .update({ suspended_at: null, suspended_reason: null, suspended_by: null })
    .eq("id", profileId);

  if (error) throw error;

  await logAudit({
    action: "user.unsuspend",
    targetType: "profile",
    targetId: profileId,
    metadata: { userId },
  });

  revalidatePath(`/usuarios/${profileId}`);
}
