// mei-limit-check edge function
// Cron job: verifica faturamento MEI de todos os profissionais Elite
// e dispara push notifications nos limites de 70%, 90% e 100%.
//
// Schedule via Supabase cron (Dashboard > Database > Cron Jobs):
//   0 9 * * *  →  todo dia às 09h
//
// Environment variables required:
//   SUPABASE_URL — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY — injected automatically

import { createClient } from "npm:@supabase/supabase-js@2";

const MEI_LIMIT = 81_000;

interface MEITracking {
  id: string;
  profissional_id: string;
  cnpj: string;
  ano: number;
  faturamento_fixr: number;
  alerta_70_enviado: boolean;
  alerta_90_enviado: boolean;
  alerta_100_enviado: boolean;
}

Deno.serve(async (req) => {
  // Allow only POST (Supabase cron sends POST)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const currentYear = new Date().getFullYear();

  // Fetch Elite professionals with MEI tracking
  const { data: trackings, error } = await supabase
    .from("mei_revenue_tracking")
    .select("*")
    .eq("ano", currentYear)
    .or("alerta_70_enviado.eq.false,alerta_90_enviado.eq.false,alerta_100_enviado.eq.false");

  if (error) {
    console.error("Error fetching MEI trackings:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const processed: string[] = [];
  const alerts: { user: string; threshold: number }[] = [];

  for (const tracking of (trackings as MEITracking[])) {
    const pct = (tracking.faturamento_fixr / MEI_LIMIT) * 100;
    const updates: Partial<MEITracking> = {};
    const notifs: Array<{ title: string; body: string; type: string }> = [];

    // Check thresholds (only send each alert once per year)
    if (pct >= 70 && !tracking.alerta_70_enviado) {
      updates.alerta_70_enviado = true;
      notifs.push({
        title: "📊 Limite MEI: 70% atingido",
        body: `Seu faturamento via Fixr atingiu R$${tracking.faturamento_fixr.toLocaleString("pt-BR")} de R$81.000. Fique atento.`,
        type: "mei_alerta_70",
      });
      alerts.push({ user: tracking.profissional_id, threshold: 70 });
    }

    if (pct >= 90 && !tracking.alerta_90_enviado) {
      updates.alerta_90_enviado = true;
      notifs.push({
        title: "⚠️ Limite MEI: 90% — Atenção!",
        body: `Você está próximo do limite MEI. Considere se enquadrar como Microempresa (ME).`,
        type: "mei_alerta_90",
      });
      alerts.push({ user: tracking.profissional_id, threshold: 90 });
    }

    if (pct >= 100 && !tracking.alerta_100_enviado) {
      updates.alerta_100_enviado = true;
      notifs.push({
        title: "🚨 Limite MEI atingido — Novas NFS-e bloqueadas",
        body: `Faturamento anual de R$81.000 atingido. Novas notas fiscais estão bloqueadas. Contate um contador.`,
        type: "mei_alerta_100",
      });
      alerts.push({ user: tracking.profissional_id, threshold: 100 });
    }

    if (Object.keys(updates).length === 0) continue;

    // Update flags in DB
    await supabase
      .from("mei_revenue_tracking")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", tracking.id);

    // Insert in-app notifications
    for (const notif of notifs) {
      await supabase.from("notifications").insert({
        user_id: tracking.profissional_id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        read: false,
      });
    }

    // Send push notifications
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    for (const notif of notifs) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            user_id: tracking.profissional_id,
            title: notif.title,
            body: notif.body,
            type: notif.type,
          }),
        });
      } catch (e) {
        console.error("Push send failed:", e);
      }
    }

    processed.push(tracking.profissional_id);
  }

  console.log(`MEI check complete: ${processed.length} professionals alerted`, alerts);

  return new Response(
    JSON.stringify({ processed: processed.length, alerts }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
