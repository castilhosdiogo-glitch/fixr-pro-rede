import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ServiceCheckin {
  id: string;
  service_request_id: string;
  client_id: string;
  professional_id: string;
  checkpoint_pct: 33 | 66;
  scheduled_for: string;
  notified_at: string | null;
  responded_at: string | null;
  response: "ok" | "problem" | null;
  comment: string | null;
  created_at: string;
  service_description?: string;
}

/** Cliente: check-ins notificados e ainda não respondidos. */
export function usePendingCheckins() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pending-checkins", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("service_checkins")
        .select(`
          *,
          service_requests!inner (description)
        `)
        .eq("client_id", user!.id)
        .not("notified_at", "is", null)
        .is("responded_at", null)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((c: any) => ({
        ...c,
        service_description: c.service_requests?.description ?? "Serviço",
      })) as ServiceCheckin[];
    },
    staleTime: 20_000,
  });
}

/** Profissional/cliente: histórico de check-ins de um serviço específico. */
export function useServiceCheckins(serviceRequestId: string | undefined) {
  return useQuery({
    queryKey: ["service-checkins", serviceRequestId],
    enabled: !!serviceRequestId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("service_checkins")
        .select("*")
        .eq("service_request_id", serviceRequestId!)
        .order("checkpoint_pct", { ascending: true });
      if (error) throw error;
      return (data || []) as ServiceCheckin[];
    },
    staleTime: 20_000,
  });
}

/** Cliente: responde um check-in (ok / problem + comentário opcional). */
export function useSubmitCheckin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      checkinId,
      response,
      comment,
    }: {
      checkinId: string;
      response: "ok" | "problem";
      comment?: string;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("service_checkins")
        .update({
          response,
          comment: comment?.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", checkinId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-checkins", user?.id] });
      qc.invalidateQueries({ queryKey: ["service-checkins"] });
    },
  });
}
