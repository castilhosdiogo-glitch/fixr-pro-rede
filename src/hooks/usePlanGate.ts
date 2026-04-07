import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanName = "explorador" | "parceiro" | "elite";

interface ProfessionalPlan {
  plan_name: PlanName;
  monthly_request_count: number;
  monthly_request_reset: string;
}

const PLAN_RANK: Record<PlanName, number> = {
  explorador: 0,
  parceiro: 1,
  elite: 2,
};

export const PLAN_LIMITS = {
  explorador: {
    requestsPerMonth: 8,
    chat: ["texto"] as string[],
    hubFiscal: false,
    agenda: false,
    quotes: false,
    team: false,
    portfolio: false,
    meiAlert: false,
    searchBoost: false,
    commission: 15,
  },
  parceiro: {
    requestsPerMonth: Infinity,
    chat: ["texto", "audio", "foto"] as string[],
    hubFiscal: true,
    agenda: false,
    quotes: false,
    team: false,
    portfolio: false,
    meiAlert: false,
    searchBoost: true,
    commission: 12,
  },
  elite: {
    requestsPerMonth: Infinity,
    chat: ["texto", "audio", "foto", "video"] as string[],
    hubFiscal: true,
    agenda: true,
    quotes: true,
    team: true,
    portfolio: true,
    meiAlert: true,
    searchBoost: true,
    commission: 10,
  },
} as const;

export const PLAN_UPGRADE_MESSAGES: Record<string, string> = {
  audio: "Envio de áudio disponível a partir do plano Parceiro (R$19,90/mês).",
  foto: "Envio de fotos disponível a partir do plano Parceiro (R$19,90/mês).",
  video: "Envio de vídeo disponível exclusivamente no plano Elite (R$39,90/mês).",
  hubFiscal: "Hub Fiscal disponível a partir do plano Parceiro (R$19,90/mês).",
  nfse: "Emissão de NFS-e disponível a partir do plano Parceiro (R$19,90/mês).",
  das: "Alertas de DAS disponíveis a partir do plano Parceiro (R$19,90/mês).",
  guiaMei: "Guia MEI assistido disponível a partir do plano Parceiro (R$19,90/mês).",
  agenda: "Agenda integrada disponível exclusivamente no plano Elite (R$39,90/mês).",
  quotes: "Orçamento personalizado disponível exclusivamente no plano Elite (R$39,90/mês).",
  team: "Gestão de equipe disponível exclusivamente no plano Elite (R$39,90/mês).",
  portfolio: "Portfólio público disponível exclusivamente no plano Elite (R$39,90/mês).",
  meiAlert: "Alerta de limite MEI em tempo real disponível exclusivamente no plano Elite (R$39,90/mês).",
};

export function useProfessionalPlan() {
  const { user, profile } = useAuth();
  const isProfessional = profile?.user_type === "professional";

  return useQuery<ProfessionalPlan | null>({
    queryKey: ["professional-plan", user?.id],
    queryFn: async () => {
      if (!user || !isProfessional) return null;
      const { data, error } = await supabase
        .from("professional_profiles")
        .select("plan_name, monthly_request_count, monthly_request_reset")
        .eq("user_id", user.id)
        .single();
      if (error) return null;
      return data as ProfessionalPlan;
    },
    enabled: !!user && isProfessional,
    staleTime: 60_000,
  });
}

export function usePlanGate() {
  const { data: planData, isLoading } = useProfessionalPlan();
  const { profile } = useAuth();
  const isProfessional = profile?.user_type === "professional";

  const plan: PlanName = planData?.plan_name ?? "explorador";
  const limits = PLAN_LIMITS[plan];
  const rank = PLAN_RANK[plan];

  const can = (feature: keyof typeof PLAN_LIMITS["elite"]): boolean => {
    if (!isProfessional) return false;
    const val = limits[feature];
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val === Infinity || val > 0;
    return true;
  };

  const canChat = (type: "audio" | "foto" | "video"): boolean => {
    if (!isProfessional) return false;
    return (limits.chat as string[]).includes(type);
  };

  const hasMinPlan = (min: PlanName): boolean => rank >= PLAN_RANK[min];

  const requestsNearLimit = (): boolean => {
    if (plan !== "explorador") return false;
    return (planData?.monthly_request_count ?? 0) >= 6;
  };

  const requestsAtLimit = (): boolean => {
    if (plan !== "explorador") return false;
    return (planData?.monthly_request_count ?? 0) >= 8;
  };

  return {
    plan,
    limits,
    isLoading,
    can,
    canChat,
    hasMinPlan,
    requestsNearLimit,
    requestsAtLimit,
    upgradeMessage: (feature: string) => PLAN_UPGRADE_MESSAGES[feature] ?? "Recurso disponível em planos superiores.",
  };
}
