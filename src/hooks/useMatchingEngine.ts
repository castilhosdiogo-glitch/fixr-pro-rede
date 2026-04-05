import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  MatchingConfig as DBMatchingConfig,
  BroadcastRequest,
  ProfessionalMetrics,
} from "@/integrations/supabase/types";

export type { BroadcastRequest, ProfessionalMetrics };

// Local alias with UI-friendly field names (matches DB schema)
export type MatchingConfig = DBMatchingConfig;

// ─── Config Hooks ────────────────────────────────────────────

export const useMatchingConfig = () => {
  return useQuery<MatchingConfig>({
    queryKey: ["matching-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matching_config")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateMatchingConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<MatchingConfig, "id" | "updated_at">>) => {
      const { error } = await supabase
        .from("matching_config")
        .update(updates)
        .limit(1);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matching-config"] }),
  });
};

// ─── Broadcast Request Hooks ─────────────────────────────────

export const useCreateBroadcastRequest = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      category_id: string;
      city: string;
      description: string;
    }) => {
      const { data, error } = await supabase
        .from("broadcast_requests")
        .insert({ ...input, client_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-broadcasts"] }),
  });
};

export const useClientBroadcasts = () => {
  const { user } = useAuth();
  return useQuery<BroadcastRequest[]>({
    queryKey: ["client-broadcasts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_requests")
        .select("*")
        .eq("client_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
};

export const useBroadcastStatus = (broadcastId: string | null) => {
  return useQuery<BroadcastRequest | null>({
    queryKey: ["broadcast-status", broadcastId],
    queryFn: async () => {
      if (!broadcastId) return null;
      const { data, error } = await supabase
        .from("broadcast_requests")
        .select("*")
        .eq("id", broadcastId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!broadcastId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "dispatching" || status === "expanding" ? 5000 : false;
    },
  });
};

// ─── Professional Metrics ─────────────────────────────────────

export const useMyMetrics = () => {
  const { user } = useAuth();
  return useQuery<ProfessionalMetrics | null>({
    queryKey: ["my-metrics", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_metrics")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};
