import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type DisputeReason =
  | "nao_compareceu"
  | "servico_incompleto"
  | "qualidade_ruim"
  | "cobranca_indevida"
  | "dano_propriedade"
  | "outro";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "resolved_refund_full"
  | "resolved_refund_partial"
  | "resolved_denied";

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  nao_compareceu: "Profissional não compareceu",
  servico_incompleto: "Serviço incompleto",
  qualidade_ruim: "Qualidade abaixo do combinado",
  cobranca_indevida: "Cobrança indevida",
  dano_propriedade: "Dano à propriedade",
  outro: "Outro motivo",
};

export interface ServiceDispute {
  id: string;
  service_request_id: string;
  payment_id: string | null;
  client_id: string;
  professional_id: string;
  opened_by: string;
  opened_by_role: "client" | "professional";
  reason: DisputeReason;
  description: string;
  evidence_snapshot: unknown;
  attachment_paths: string[];
  status: DisputeStatus;
  resolution_amount_cents: number | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  service_description?: string;
}

/** Cliente: minhas disputas abertas/históricas. */
export function useMyDisputes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-disputes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("service_disputes")
        .select("*")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ServiceDispute[];
    },
    staleTime: 20_000,
  });
}

/** Cliente: abre uma disputa sobre um serviço concluído (via RPC — única escrita permitida). */
export function useOpenDispute() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      serviceRequestId: string;
      reason: DisputeReason;
      description: string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("open_service_dispute", {
        p_service_request_id: payload.serviceRequestId,
        p_reason: payload.reason,
        p_description: payload.description,
        p_attachment_paths: [],
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-disputes", user?.id] });
    },
  });
}

// ─── Admin ───────────────────────────────────────────────────────────────────

/** Admin: fila de disputas abertas/em análise. */
export function useAdminDisputeQueue() {
  return useQuery({
    queryKey: ["admin-dispute-queue"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("service_disputes")
        .select(`
          *,
          service_requests (description)
        `)
        .in("status", ["open", "under_review"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((d: any) => ({
        ...d,
        service_description: d.service_requests?.description ?? "Serviço",
      })) as ServiceDispute[];
    },
    staleTime: 20_000,
  });
}

/** Admin: resolve uma disputa via edge function (chama Pagar.me quando é reembolso). */
export function useAdminResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      disputeId: string;
      resolution: "refund_full" | "refund_partial" | "deny";
      refundAmountCents?: number;
      resolutionNotes: string;
    }) => {
      const session = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-resolve-dispute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          dispute_id: payload.disputeId,
          resolution: payload.resolution,
          refund_amount_cents: payload.refundAmountCents,
          resolution_notes: payload.resolutionNotes,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Erro ao resolver disputa");
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-dispute-queue"] });
    },
  });
}
