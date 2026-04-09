import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanName = "explorador" | "parceiro";

export type PlanFeature = keyof typeof PLAN_LIMITS.explorador;

export const PLAN_LIMITS = {
  explorador: {
    label: "Explorador",
    monthlyRequests: 8,
    commissionRate: 15,
    chatText: true,
    chatAudio: false,
    chatPhoto: true,
    chatVideo: false,
    hubFiscalNfse: false,
    hubFiscalDas: false,
    hubFiscalMeiLimit: false,
    agenda: false,
    quotes: false,
    teamManagement: false,
    portfolioLimit: 0,
    meiRevenueTracking: false,
    searchBoost: 0,
    price: 0,
  },
  parceiro: {
    label: "Parceiro",
    monthlyRequests: Infinity,
    commissionRate: 10,
    chatText: true,
    chatAudio: true,
    chatPhoto: true,
    chatVideo: true,
    hubFiscalNfse: true,
    hubFiscalDas: true,
    hubFiscalMeiLimit: true,
    agenda: true,
    quotes: true,
    teamManagement: true,
    portfolioLimit: 20,
    meiRevenueTracking: true,
    searchBoost: 2,
    price: 2990,
  },
} as const;

export interface PlanGate {
  plan: PlanName;
  limits: (typeof PLAN_LIMITS)[PlanName];
  monthlyRequestCount: number;
  requestsRemaining: number | null;
  canAcceptRequest: boolean;
  isLoading: boolean;
  can: (feature: PlanFeature) => boolean;
  isParceiro: boolean;
  upgradeMessage: string | null;
}

export function usePlanGate(): PlanGate {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["plan-gate", user?.id],
    queryFn: async () => {
      const [proRes, countRes] = await Promise.all([
        supabase
          .from("professional_profiles")
          .select("plan_name, monthly_request_count, commission_rate, search_boost")
          .eq("user_id", user!.id)
          .single(),
        supabase.rpc("get_monthly_request_count", { p_user_id: user!.id }),
      ]);

      // Migrate any legacy "elite" plan to "parceiro"
      const rawPlan = proRes.data?.plan_name ?? "explorador";
      const plan: PlanName = rawPlan === "elite" ? "parceiro" : (rawPlan as PlanName);

      return {
        plan,
        monthlyRequestCount: (typeof countRes.data === "number" ? countRes.data : 0),
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const plan = data?.plan ?? "explorador";
  const limits = PLAN_LIMITS[plan];
  const monthlyRequestCount = data?.monthlyRequestCount ?? 0;
  const requestsRemaining =
    limits.monthlyRequests === Infinity
      ? null
      : Math.max(0, limits.monthlyRequests - monthlyRequestCount);

  const canAcceptRequest = requestsRemaining === null || requestsRemaining > 0;

  let upgradeMessage: string | null = null;
  if (plan === "explorador") {
    if (requestsRemaining === 0) {
      upgradeMessage = "Você atingiu o limite de 8 solicitações este mês. Seja Parceiro e tenha pedidos ilimitados por R$ 29,90/mês.";
    } else if (requestsRemaining !== null && requestsRemaining <= 2) {
      upgradeMessage = `Restam apenas ${requestsRemaining} solicitações este mês. Seja Parceiro para não ter limites.`;
    }
  }

  return {
    plan,
    limits,
    monthlyRequestCount,
    requestsRemaining,
    canAcceptRequest,
    isLoading,
    can: (feature) => !!limits[feature],
    isParceiro: plan === "parceiro",
    upgradeMessage,
  };
}
