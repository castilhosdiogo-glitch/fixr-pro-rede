import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PendingReview {
  id: string;
  service_request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: "client" | "professional";
  due_at: string;
  blocks_at: string | null;
  fulfilled: boolean;
  created_at: string;
  reviewee_name?: string;
}

export interface ReviewPayload {
  service_request_id: string;
  professional_id: string;
  client_id: string;
  reviewer_role: "client" | "professional";
  rating: number;
  comment?: string;
  pontualidade?: number;
  qualidade?: number;
  comunicacao?: number;
  preco_justo?: number;
}

/** Lista pendências de avaliação do usuário logado. */
export const usePendingReviews = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pending-reviews", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("pending_reviews")
        .select(`
          *,
          reviewee:reviewee_id (full_name)
        `)
        .eq("reviewer_id", user!.id)
        .eq("fulfilled", false)
        .order("due_at", { ascending: true });

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((r: any) => ({
        ...r,
        reviewee_name: r.reviewee?.full_name || "Usuário",
      })) as PendingReview[];
    },
  });
};

/** Retorna true se o pro está bloqueado de aceitar novos pedidos. */
export const useIsProBlockedByPending = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-blocked-pending", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("fixr_pro_blocked_by_pending", {
        _pro: user!.id,
      });
      if (error) throw error;
      return Boolean(data);
    },
    staleTime: 60_000,
  });
};

/** Submete uma avaliação (cliente ou pro). */
export const useSubmitReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ReviewPayload) => {
      const { error } = await supabase.from("reviews").insert({
        service_request_id: payload.service_request_id,
        professional_id: payload.professional_id,
        client_id: payload.client_id,
        rating: payload.rating,
        comment: payload.comment ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reviewer_role: payload.reviewer_role as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pontualidade: payload.pontualidade ?? null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        qualidade: payload.qualidade ?? null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        comunicacao: payload.comunicacao ?? null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preco_justo: payload.preco_justo ?? null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-reviews"] });
      qc.invalidateQueries({ queryKey: ["pro-blocked-pending"] });
    },
  });
};
