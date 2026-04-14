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

export async function forceUpgrade(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!profileId) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("professional_profiles")
    .update({ plan_name: "parceiro", commission_rate: 10, search_boost: 2 })
    .eq("id", profileId);

  if (error) throw error;

  await logAudit({
    action: "plan.force_upgrade",
    targetType: "professional_profile",
    targetId: profileId,
    metadata: { userId, to: "parceiro" },
  });

  revalidatePath("/planos");
}

export async function cancelSubscription(formData: FormData) {
  await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!profileId || !reason) return;

  const service = createServiceRoleClient();
  const { error } = await service
    .from("professional_profiles")
    .update({ plan_name: "explorador", commission_rate: 15, search_boost: 0 })
    .eq("id", profileId);

  if (error) throw error;

  await logAudit({
    action: "plan.cancel_subscription",
    targetType: "professional_profile",
    targetId: profileId,
    metadata: { userId, reason },
  });

  revalidatePath("/planos");
}
