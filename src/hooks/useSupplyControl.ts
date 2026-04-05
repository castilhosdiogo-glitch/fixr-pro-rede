import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────

export type SlotStatus = "OPEN" | "ALMOST_FULL" | "FULL";

export interface SlotOccupancy {
  id: string;
  category_id: string;
  category_name: string;
  city: string;
  max_professionals: number;
  active_professionals: number;
  available_slots: number;
  occupancy_pct: number;
  status: SlotStatus;
  waiting_count: number;
}

export interface SupplyLimit {
  id: string;
  category_id: string;
  city: string;
  max_professionals: number;
}

// ─── Status config (shared UI constants) ─────────────────────

export const SLOT_STATUS_CONFIG: Record<
  SlotStatus,
  { label: string; color: string; barColor: string; bgColor: string; borderColor: string }
> = {
  OPEN: {
    label: "Vagas Disponíveis",
    color: "text-green-400",
    barColor: "bg-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  ALMOST_FULL: {
    label: "Poucas Vagas",
    color: "text-yellow-400",
    barColor: "bg-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  FULL: {
    label: "Lotado",
    color: "text-red-400",
    barColor: "bg-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

// ─── Hooks ───────────────────────────────────────────────────

/**
 * Fetches slot occupancy for all (or filtered) category+city combos.
 * Uses the `slot_occupancy` database view.
 */
export const useSlotOccupancy = (categoryId?: string, city?: string) => {
  return useQuery<SlotOccupancy[]>({
    queryKey: ["slot-occupancy", categoryId ?? "all", city ?? "all"],
    queryFn: async () => {
      let q = supabase.from("slot_occupancy").select("*");
      if (categoryId) q = q.eq("category_id", categoryId);
      if (city) q = q.eq("city", city);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SlotOccupancy[];
    },
    staleTime: 1000 * 60 * 2, // 2-minute cache
  });
};

/**
 * Checks whether a specific category+city slot has room.
 * Calls the `check_slot_available` Postgres function.
 * Returns `true` when slot is available (or no limit configured).
 */
export const useCheckSlot = (categoryId: string, city: string) => {
  return useQuery<boolean>({
    queryKey: ["slot-available", categoryId, city],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "check_slot_available",
        { p_category_id: categoryId, p_city: city }
      );
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!categoryId && !!city,
    staleTime: 1000 * 30, // 30-second cache — changes are important
  });
};

/**
 * Admin: update max_professionals for a given supply limit row.
 */
export const useUpdateSupplyLimit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      max_professionals,
    }: {
      id: string;
      max_professionals: number;
    }) => {
      const { error } = await supabase
        .from("supply_limits")
        .update({ max_professionals })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slot-occupancy"] });
    },
  });
};
