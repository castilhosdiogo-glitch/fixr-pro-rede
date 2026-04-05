import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  VerificationLevel,
  ActivityStatus,
  ProfessionalReputationView,
  TrustScore,
  ProfessionalTag,
} from "@/integrations/supabase/types";

export type { VerificationLevel, ActivityStatus };

export interface ReputationTag {
  tag: string;
  label: string;
  icon: string;
}

export type ProfessionalReputation = ProfessionalReputationView;

export interface TrustScoreBreakdown {
  total_score: number;
  verification_level: VerificationLevel;
  rating_points: number;
  completed_points: number;
  response_points: number;
  acceptance_points: number;
  activity_points: number;
  updated_at: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useProfessionalReputation(professionalId: string | undefined) {
  return useQuery<ProfessionalReputation | null>({
    queryKey: ["reputation", professionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_reputation")
        .select("*")
        .eq("user_id", professionalId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!professionalId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProfessionalReputationByUserId(userId: string | undefined) {
  return useQuery<ProfessionalReputation | null>({
    queryKey: ["reputation-uid", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_reputation")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyReputation() {
  const { user } = useAuth();
  return useProfessionalReputationByUserId(user?.id);
}

export function useMyTrustBreakdown() {
  const { user } = useAuth();
  return useQuery<TrustScoreBreakdown | null>({
    queryKey: ["trust-breakdown", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trust_scores")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as TrustScoreBreakdown | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfessionalTags(userId: string | undefined) {
  return useQuery<ReputationTag[]>({
    queryKey: ["pro-tags", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_tags")
        .select("tag")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((row: Pick<ProfessionalTag, "tag">) => ({
        tag: row.tag,
        label: row.tag,
        icon: "star",
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubmitReview() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      professional_id: string;
      service_request_id: string;
      rating: number;
      comment?: string;
    }) => {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          client_id: user!.id,
          professional_id: params.professional_id,
          service_request_id: params.service_request_id,
          rating: params.rating,
          comment: params.comment ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["reputation-uid", vars.professional_id] });
      qc.invalidateQueries({ queryKey: ["professional", vars.professional_id] });
      qc.invalidateQueries({ queryKey: ["completed-awaiting-review"] });
    },
  });
}

export function useRecomputeTrustScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("compute_trust_score", {
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, userId) => {
      qc.invalidateQueries({ queryKey: ["reputation-uid", userId] });
      qc.invalidateQueries({ queryKey: ["trust-breakdown", userId] });
    },
  });
}
