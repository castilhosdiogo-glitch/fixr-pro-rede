import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProAvailability {
  disponivel: boolean;
  raio_km: number;
  latitude: number | null;
  longitude: number | null;
}

export function useProAvailability() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-availability", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async (): Promise<ProAvailability | null> => {
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            eq: (c: string, v: string) => {
              maybeSingle: () => Promise<{ data: ProAvailability | null; error: Error | null }>;
            };
          };
        };
      })
        .from("professional_profiles")
        .select("disponivel, raio_km, latitude, longitude")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProAvailability() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<ProAvailability>) => {
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          update: (p: Partial<ProAvailability>) => {
            eq: (c: string, v: string) => Promise<{ error: Error | null }>;
          };
        };
      })
        .from("professional_profiles")
        .update(patch)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pro-availability", user?.id] });
    },
  });
}
