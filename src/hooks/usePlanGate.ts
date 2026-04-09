import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanName = "explorador" | "parceiro" | "elite";

export type PlanFeature = keyof typeof PLAN_LIMITS.explorador;

export const PLAN_LIMITS = {
  explorador: {
    label: "Explorador",
    monthlyRequests: 8,
    commissionRate: 15,
    chatText: true,
    chatAudio: false,
    chatPhoto: false,
    chatVideo: false,
    hubFiscalNfse: false,
    hubFiscalDas: false,
    hubFiscalMeiLimit: false,
    agenda: false,
    quotes: false,
    teamManagement: false,
    portfolioLimit: 5,
    meiRevenueTracking: false,
    searchBoost: 0,
    price: 0,
  },
  parceiro: {
    label: "Parceiro",
    monthlyRequests: Infinity,
    commissionRate: 12,
    chatText: true,
    chatAudio: true,
    chatPhoto: true,
    chatVideo: false,
    hubFiscalNfse: true,
    hubFiscalDas: true,
    hubFiscalMeiLimit: false,
    agenda: false,
    quotes: false,
    teamManagement: false,
    portfolioLimit: 10,
    meiRevenueTracking: false,
    searchBoost: 1,
    price: 1990,
  },
  elite: {
    label: "Elite",
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
    price: 3990,
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
  hasMinPlan: (min: PlanName) => boolean;
  isParceiro: boolean;
  isElite: boolean;
  upgradeMessage: string | null;
}

const PLAN_ORDER: Record<PlanName, number> = {
  explorador: 0,
  parceiro: 1,
  elite: 2,
};

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

      return {
        plan: (proRes.data?.plan_name ?? "explorador") as PlanName,
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
      upgradeMessage = "Você atingiu o limite de 8 solicitações este mês. Faça upgrade para o plano Parceiro para solicitações ilimitadas.";
    } else if (requestsRemaining !== null && requestsRemaining <= 2) {
      upgradeMessage = `Restam apenas ${requestsRemaining} solicitações este mês. Considere o plano Parceiro para não ter limites.`;
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
    hasMinPlan: (min) => PLAN_ORDER[plan] >= PLAN_ORDER[min],
    isParceiro: PLAN_ORDER[plan] >= PLAN_ORDER.parceiro,
    isElite: plan === "elite",
    upgradeMessage,
  };
}
