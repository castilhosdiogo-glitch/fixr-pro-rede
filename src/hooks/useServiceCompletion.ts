import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ActiveService {
  id: string;
  description: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  client_id: string;
  professional_id: string;
  client_name: string;
  client_city: string;
}

export interface CompletedService {
  id: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  professional_id: string;
  professional_name: string;
  professional_city: string;
}

/** Professional: list of accepted/scheduled services that can be completed */
export function useActiveServices() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-services", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select(
          "id, description, status, scheduled_date, created_at, updated_at, client_id, professional_id",
        )
        .eq("professional_id", user!.id)
        .in("status", ["accepted", "scheduled"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const clientIds = Array.from(new Set((data ?? []).map((r) => r.client_id)));
      const profilesMap = new Map<string, { full_name: string | null; city: string | null }>();
      if (clientIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, city")
          .in("user_id", clientIds);
        for (const p of profs ?? []) {
          profilesMap.set(p.user_id as string, {
            full_name: p.full_name,
            city: p.city,
          });
        }
      }

      return (data ?? []).map((r) => {
        const p = profilesMap.get(r.client_id);
        return {
          id: r.id,
          description: r.description,
          status: r.status,
          scheduled_date: (r as { scheduled_date?: string | null }).scheduled_date ?? null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          client_id: r.client_id,
          professional_id: r.professional_id,
          client_name: p?.full_name ?? "Cliente",
          client_city: p?.city ?? "",
        } satisfies ActiveService;
      });
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

/** Professional: mark a service_request as completed */
export function useMarkServiceCompleted() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (serviceRequestId: string) => {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "completed" })
        .eq("id", serviceRequestId)
        .eq("professional_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-services", user?.id] });
      qc.invalidateQueries({ queryKey: ["professionalDashboard", user?.id] });
      qc.invalidateQueries({ queryKey: ["trust-breakdown", user?.id] });
    },
  });
}

/** Professional: propose a scheduled date for an accepted service */
export function useScheduleService() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      requestId,
      scheduledDate,
    }: {
      requestId: string;
      scheduledDate: string; // ISO string
    }) => {
      const { error } = await supabase.rpc("schedule_service", {
        p_request_id: requestId,
        p_scheduled_date: scheduledDate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-services", user?.id] });
      qc.invalidateQueries({ queryKey: ["professionalDashboard", user?.id] });
    },
  });
}

/** Client: list of completed services that don't have a review yet */
export function useCompletedServicesAwaitingReview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["completed-awaiting-review", user?.id],
    queryFn: async () => {
      // Single query using NOT IN subquery via RPC-style filter
      const { data: services, error } = await supabase
        .from("service_requests")
        .select(`
          id, description, status, created_at, updated_at,
          professional_id,
          profiles!service_requests_professional_id_fkey (full_name, city)
        `)
        .eq("client_id", user!.id)
        .eq("status", "completed")
        .order("updated_at", { ascending: false });
      if (error) throw error;

      // Get already-reviewed service_request_ids
      const { data: reviews } = await supabase
        .from("reviews")
        .select("service_request_id")
        .eq("client_id", user!.id)
        .not("service_request_id", "is", null);

      const reviewedIds = new Set(
        (reviews ?? []).map((r) => r.service_request_id).filter(Boolean)
      );

      return (services ?? [])
        .filter((s) => !reviewedIds.has(s.id))
        .map((s) => {
          const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
          return {
            id: s.id,
            description: s.description,
            status: s.status,
            created_at: s.created_at,
            updated_at: s.updated_at,
            professional_id: s.professional_id,
            professional_name: profile?.full_name ?? "Profissional",
            professional_city: profile?.city ?? "",
          } satisfies CompletedService;
        });
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
