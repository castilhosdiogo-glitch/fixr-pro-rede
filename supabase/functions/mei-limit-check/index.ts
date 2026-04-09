// mei-limit-check edge function
// Cron job: checks all Elite professionals' MEI revenue vs R$81k limit
// Sends push notifications at 70%, 90%, 100% thresholds
//
// Deploy: supabase functions deploy mei-limit-check
// Schedule via pg_cron or external cron hitting this endpoint with service role key

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflightResponse, errorResponse, successResponse } from "../shared/response.ts";

const MEI_ANNUAL_LIMIT = 81000;
const THRESHOLDS = [
  { pct: 100, tag: "mei_100", title: "LIMITE MEI ATINGIDO", body: "Sua receita atingiu 100% do limite MEI de R$ 81.000. Procure um contador." },
  { pct: 90, tag: "mei_90", title: "ALERTA MEI: 90%", body: "Sua receita está em 90% do limite MEI. Atenção ao faturamento." },
  { pct: 70, tag: "mei_70", title: "AVISO MEI: 70%", body: "Sua receita atingiu 70% do limite MEI anual." },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflightResponse();

  try {
    // Auth: only allow service role key (cron/internal calls)
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader.includes(serviceRoleKey)) {
      return errorResponse("Unauthorized", 401);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Get all Elite professionals with MEI revenue data
    const { data: parceiroProfiles, error: profilesError } = await db
      .from("professional_profiles")
      .select("id, user_id, plan_name")
      .eq("plan_name", "parceiro");

    if (profilesError) throw profilesError;
    if (!parceiroProfiles || parceiroProfiles.length === 0) {
      return successResponse({ message: "No parceiro profiles to check", checked: 0 });
    }

    let notificationsSent = 0;

    for (const profile of parceiroProfiles) {
      // Get total revenue for this year
      const { data: revenues } = await db
        .from("mei_revenue_tracking")
        .select("revenue")
        .eq("professional_id", profile.id)
        .gte("month", yearStart)
        .lte("month", yearEnd);

      const totalRevenue = (revenues || []).reduce((sum: number, r: { revenue: number }) => sum + r.revenue, 0);
      const percentage = (totalRevenue / MEI_ANNUAL_LIMIT) * 100;

      // Find the highest threshold crossed
      const threshold = THRESHOLDS.find((t) => percentage >= t.pct);
      if (!threshold) continue;

      // Check de-duplication: has this notification already been sent this year?
      const { data: existingNotif } = await db
        .from("notifications")
        .select("id")
        .eq("user_id", profile.user_id)
        .eq("tag", `${threshold.tag}_${currentYear}`)
        .limit(1);

      if (existingNotif && existingNotif.length > 0) continue;

      // Insert notification
      await db.from("notifications").insert({
        user_id: profile.user_id,
        title: threshold.title,
        body: threshold.body,
        tag: `${threshold.tag}_${currentYear}`,
        type: "mei_alert",
      });

      // Try to send push notification via push-notify function
      try {
        await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId: profile.user_id,
            title: threshold.title,
            body: threshold.body,
            tag: `${threshold.tag}_${currentYear}`,
          }),
        });
      } catch {
        // Push may fail if user has no subscription — that's OK
      }

      notificationsSent++;
    }

    return successResponse({
      message: "MEI limit check complete",
      checked: parceiroProfiles.length,
      notificationsSent,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
});
