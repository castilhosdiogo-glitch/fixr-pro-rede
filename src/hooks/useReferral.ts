import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────

export type ReferralStatus = "pending" | "profile_complete" | "active" | "rewarded" | "fraud";

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  clicks: number;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  code_used: string;
  status: ReferralStatus;
  created_at: string;
  profile_completed_at: string | null;
  activated_at: string | null;
  rewarded_at: string | null;
  // joined
  referred_profile?: {
    full_name: string;
    city: string | null;
    avatar_url: string | null;
  };
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_id: string;
  reward_type: "subscription_month" | "visibility_boost" | "ranking_boost";
  months: number | null;
  boost_days: number | null;
  tier: number;
  status: "pending" | "applied" | "expired";
  granted_at: string;
  expires_at: string | null;
  applied_at: string | null;
}

export interface ReferralStats {
  user_id: string;
  code: string;
  clicks: number;
  total_referrals: number;
  pending_count: number;
  profile_complete_count: number;
  active_count: number;
  fraud_count: number;
  months_earned: number;
  visibility_days_earned: number;
  ranking_days_earned: number;
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  city: string | null;
  category_name: string | null;
  verified: boolean;
  active_referrals: number;
  total_referrals: number;
  months_earned: number;
  position: number;
}

// ─── Referral Code ───────────────────────────────────────────

/**
 * Gets or creates the referral code for the current professional.
 * Returns the full code object + the shareable URL.
 */
export const useMyReferralCode = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery<{ code: ReferralCode; url: string } | null>({
    queryKey: ["referral-code", user?.id],
    queryFn: async () => {
      // Ensure a code exists (RPC is idempotent)
      const { data: codeStr, error: rpcErr } = await supabase.rpc(
        "get_or_create_referral_code",
        { p_user_id: user!.id }
      );
      if (rpcErr) throw rpcErr;

      const { data, error } = await supabase
        .from("referral_codes")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;

      const code = data as ReferralCode;
      const url = `${window.location.origin}/auth?ref=${code.code}`;
      return { code, url };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });
};

// ─── Referrals list ──────────────────────────────────────────

/**
 * Lists all referrals made by the current professional,
 * joined with the referred user's profile.
 */
export const useMyReferrals = () => {
  const { user } = useAuth();
  return useQuery<Referral[]>({
    queryKey: ["my-referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select(`
          *,
          referred_profile:referred_id (
            full_name, city, avatar_url
          )
        `)
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Referral[];
    },
    enabled: !!user,
  });
};

// ─── Stats ───────────────────────────────────────────────────

export const useMyReferralStats = () => {
  const { user } = useAuth();
  return useQuery<ReferralStats | null>({
    queryKey: ["referral-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_stats")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ReferralStats | null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
};

// ─── Rewards ─────────────────────────────────────────────────

export const useMyRewards = () => {
  const { user } = useAuth();
  return useQuery<ReferralReward[]>({
    queryKey: ["referral-rewards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_rewards")
        .select("*")
        .eq("user_id", user!.id)
        .order("granted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReferralReward[];
    },
    enabled: !!user,
  });
};

/**
 * Triggers `apply_pending_rewards()` to flush pending rewards
 * onto professional_profiles. Call after viewing rewards page.
 */
export const useApplyPendingRewards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("apply_pending_rewards", {
        p_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral-rewards", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["referral-stats", user?.id] });
    },
  });
};

// ─── Apply referral code at signup ───────────────────────────

/**
 * Called once after a new user registers, if they arrived via a referral link.
 */
export const useApplyReferralCode = () => {
  return useMutation({
    mutationFn: async ({
      referredId,
      code,
      fingerprintHash,
    }: {
      referredId: string;
      code: string;
      fingerprintHash?: string;
    }) => {
      const { data, error } = await supabase.rpc("apply_referral", {
        p_referred_id: referredId,
        p_code: code,
        p_referred_ip_hash: null,
        p_fingerprint: fingerprintHash ?? null,
      });
      if (error) throw error;
      return data as string; // 'ok' | 'self_referral' | 'code_not_found' | 'already_referred'
    },
  });
};

// ─── Leaderboard ─────────────────────────────────────────────

export const useReferralLeaderboard = (limit = 10) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["referral-leaderboard", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_leaderboard")
        .select("*")
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    staleTime: 1000 * 60 * 5,
  });
};
