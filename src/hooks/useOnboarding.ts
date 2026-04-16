import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface OnboardingState {
  user_type: "professional" | "client" | null;
  completo: boolean;
  passo_atual: number;
  total_passos: number;
  missing: string[];
}

/** Estado atual do onboarding (passos concluídos, faltantes, completude). */
export const useOnboardingState = () => {
  const { user } = useAuth();
  return useQuery<OnboardingState | null>({
    queryKey: ["onboarding-state", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("fixr_get_onboarding_state", {
        _user_id: user!.id,
      });
      if (error) throw error;
      return data as OnboardingState;
    },
  });
};

/** Atualiza o passo atual do wizard profissional (1..6). */
export const useSetProOnboardingStep = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (step: number) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("fixr_set_pro_onboarding_step", {
        _user_id: user!.id,
        _step: step,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-state", user?.id] });
    },
  });
};

/** Marca onboarding do profissional como concluído (passo 6 finalizado). */
export const useCompleteProOnboarding = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc("fixr_complete_pro_onboarding", {
        _user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-state", user?.id] });
    },
  });
};

/**
 * Atualiza endereço principal do cliente (finaliza onboarding cliente).
 * Para clientes, a "conclusão" é simplesmente ter endereco_principal preenchido.
 */
export const useSetClientAddress = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { endereco: string; lat?: number; lng?: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          endereco_principal: p.endereco,
          endereco_lat: p.lat ?? null,
          endereco_lng: p.lng ?? null,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-state", user?.id] });
    },
  });
};
