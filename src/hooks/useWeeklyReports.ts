import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────

export interface WeeklyReportSummary {
  broadcasts: {
    total: number;
    accepted: number;
    expired: number;
    cancelled: number;
    no_pros_available: number;
    in_flight: number;
    accept_rate: number;
    avg_response_minutes: number;
  };
  by_city: Array<{
    city: string;
    total: number;
    accepted: number;
  }>;
  by_category: Array<{
    category_id: string;
    category_name: string | null;
    total: number;
    accepted: number;
  }>;
  waiting_list: {
    pending_total: number;
    added_this_week: number;
    notified_this_week: number;
  };
  pros: {
    active_total: number;
    new_signups_week: number;
    onboarded_week: number;
  };
  supply_health: {
    under_demand: Array<{
      category_id: string;
      category_name: string;
      city: string;
      orders_per_pro: number;
      active_pros: number;
      orders: number;
    }>;
    over_demand: Array<{
      category_id: string;
      category_name: string;
      city: string;
      orders_per_pro: number;
      active_pros: number;
      orders: number;
    }>;
    no_pros_slots: Array<{
      category_id: string;
      category_name: string;
      city: string;
      max_slots: number;
    }>;
    healthy_count: number;
  };
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  summary: WeeklyReportSummary;
  created_at: string;
}

// ─── Hooks ───────────────────────────────────────────────────

/** Admin query: últimos N relatórios semanais, mais recente primeiro. */
export const useWeeklyReports = (limit = 12) => {
  return useQuery<WeeklyReport[]>({
    queryKey: ["weekly-reports", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as WeeklyReport[];
    },
  });
};

/** Admin mutation: gera/regera o relatório da semana passada agora. */
export const useGenerateWeeklyReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weekStart?: string) => {
      const { data, error } = await supabase.rpc("generate_weekly_report", {
        p_week_start: weekStart ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-reports"] });
    },
  });
};
