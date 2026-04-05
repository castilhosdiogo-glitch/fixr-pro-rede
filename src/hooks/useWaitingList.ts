import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────

export interface WaitingListEntry {
  id: string;
  name: string;
  phone: string;
  category_id: string;
  city: string;
  created_at: string;
  notified_at: string | null;
}

export interface JoinWaitingListInput {
  name: string;
  phone: string;
  category_id: string;
  city: string;
}

// ─── Hooks ───────────────────────────────────────────────────

/**
 * Mutation: add a new entry to the waiting list.
 * Available to unauthenticated users (RLS INSERT allows all).
 */
export const useJoinWaitingList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: JoinWaitingListInput) => {
      const { data, error } = await supabase
        .from("waiting_list")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as WaitingListEntry;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["waiting-list", variables.category_id, variables.city],
      });
      queryClient.invalidateQueries({ queryKey: ["slot-occupancy"] });
    },
  });
};

/**
 * Admin query: list all waiting entries, optionally filtered by
 * category and/or city. Ordered oldest-first (FIFO queue).
 */
export const useWaitingList = (categoryId?: string, city?: string) => {
  return useQuery<WaitingListEntry[]>({
    queryKey: ["waiting-list", categoryId ?? "all", city ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("waiting_list")
        .select("*")
        .order("created_at", { ascending: true });
      if (categoryId) q = q.eq("category_id", categoryId);
      if (city) q = q.eq("city", city);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaitingListEntry[];
    },
  });
};

/**
 * Admin mutation: mark the next un-notified entry as notified
 * (calls `notify_waiting_list` Postgres function).
 */
export const useNotifyWaitingList = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      categoryId,
      city,
    }: {
      categoryId: string;
      city: string;
    }) => {
      const { error } = await supabase.rpc("notify_waiting_list", {
        p_category_id: categoryId,
        p_city: city,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waiting-list"] });
      queryClient.invalidateQueries({ queryKey: ["slot-occupancy"] });
    },
  });
};
