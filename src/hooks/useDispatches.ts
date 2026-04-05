import { useQuery, useMutation, useQueryClient, useEffect } from "@tanstack/react-query";
import { useEffect as useReactEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────

export type DispatchStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled";

export interface Dispatch {
  id: string;
  broadcast_id: string;
  professional_id: string;
  round: number;
  score: number;
  status: DispatchStatus;
  dispatched_at: string;
  responded_at: string | null;
  expires_at: string;
  // joined from broadcast_requests
  broadcast?: {
    client_id: string;
    category_id: string;
    city: string;
    description: string;
    status: string;
  };
}

// ─── Professional side ────────────────────────────────────────

/**
 * Fetches all dispatch records assigned to the current professional.
 * Includes the broadcast details (description, city, category).
 */
export const useProfessionalDispatches = (statusFilter?: DispatchStatus) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Dispatch[]>({
    queryKey: ["professional-dispatches", user?.id, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("request_dispatches")
        .select(`
          *,
          broadcast:broadcast_id (
            client_id, category_id, city, description, status
          )
        `)
        .eq("professional_id", user!.id)
        .order("dispatched_at", { ascending: false });

      if (statusFilter) q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Dispatch[];
    },
    enabled: !!user,
  });

  // Real-time subscription: invalidate when a new dispatch arrives for this pro
  useReactEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dispatches-pro-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_dispatches",
          filter: `professional_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["professional-dispatches", user.id] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "request_dispatches",
          filter: `professional_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["professional-dispatches", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
};

/**
 * Professional responds to a dispatch: 'accepted' | 'declined'.
 * Calls the `handle_dispatch_response` Postgres function.
 */
export const useRespondToDispatch = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dispatchId,
      response,
    }: {
      dispatchId: string;
      response: "accepted" | "declined";
    }) => {
      const { error } = await supabase.rpc("handle_dispatch_response", {
        p_dispatch_id: dispatchId,
        p_response: response,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-dispatches", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-metrics", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["professionalDashboard", user?.id] });
    },
  });
};

// ─── Client side ─────────────────────────────────────────────

/**
 * Fetches all dispatch records for a specific broadcast (client view).
 * Shows which professionals were contacted + their response.
 */
export const useBroadcastDispatches = (broadcastId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Dispatch[]>({
    queryKey: ["broadcast-dispatches", broadcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("request_dispatches")
        .select("*")
        .eq("broadcast_id", broadcastId)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Dispatch[];
    },
    enabled: !!broadcastId && !!user,
  });

  // Subscribe to dispatch updates on this broadcast
  useReactEffect(() => {
    if (!broadcastId || !user) return;
    const channel = supabase
      .channel(`dispatches-broadcast-${broadcastId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "request_dispatches",
          filter: `broadcast_id=eq.${broadcastId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["broadcast-dispatches", broadcastId] });
          queryClient.invalidateQueries({ queryKey: ["broadcast-status", broadcastId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [broadcastId, user, queryClient]);

  return query;
};
