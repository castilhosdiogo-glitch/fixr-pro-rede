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

export async function releaseEscrow(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("payments")
    .update({
      escrow_status: "released",
      escrow_released_at: new Date().toISOString(),
      escrow_released_by: admin.id,
    })
    .eq("id", paymentId)
    .in("escrow_status", ["holding", "held_by_admin"]);

  if (error) throw error;

  await logAudit({
    action: "finance.release_escrow",
    targetType: "payment",
    targetId: paymentId,
  });

  revalidatePath("/financeiro");
}

export async function holdEscrow(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!paymentId || !reason) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("payments")
    .update({
      escrow_status: "held_by_admin",
      escrow_hold_at: new Date().toISOString(),
      escrow_hold_by: admin.id,
      escrow_hold_reason: reason,
    })
    .eq("id", paymentId)
    .eq("escrow_status", "holding");

  if (error) throw error;

  await logAudit({
    action: "finance.hold_escrow",
    targetType: "payment",
    targetId: paymentId,
    metadata: { reason },
  });

  revalidatePath("/financeiro");
}

export async function refundPayment(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!paymentId || !reason) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("payments")
    .update({
      status: "refunded",
      escrow_status: "refunded",
      refunded_at: new Date().toISOString(),
      refunded_by: admin.id,
      refund_reason: reason,
    })
    .eq("id", paymentId)
    .neq("escrow_status", "refunded");

  if (error) throw error;

  await logAudit({
    action: "finance.refund",
    targetType: "payment",
    targetId: paymentId,
    metadata: { reason },
  });

  revalidatePath("/financeiro");
}
