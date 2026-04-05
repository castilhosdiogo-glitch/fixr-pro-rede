import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Stripe.js will be loaded via CDN
declare const Stripe: any;

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
const COMMISSION_PERCENT = 15;

export interface PaymentIntentData {
  client_secret: string;
  amount_cents: number;
}

/**
 * Create a payment for a broadcast request.
 * Amount is in cents (e.g., 5000 = R$ 50.00)
 */
export function useCreatePaymentIntent() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      amount_cents,
      professionalId,
    }: {
      broadcastId: string;
      amount_cents: number;
      professionalId: string;
    }): Promise<PaymentIntentData> => {
      // Validate amount client-side first
      if (amount_cents < 100 || amount_cents > 10000000) {
        throw new Error("Valor deve ser entre R$1,00 e R$100.000,00");
      }

      // Generate idempotency key (unique per request)
      const idempotencyKey = `${user?.id}-${broadcastId}-${Date.now()}`;

      // Call edge function to create payment intent
      const session = await supabase.auth.getSession();
      const response = await fetch(
        "https://hoymfqveawkomiixtvpw.supabase.co/functions/v1/create-payment-intent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            broadcast_id: broadcastId,
            professional_id: professionalId,
            amount_cents,
            client_id: user?.id,
            idempotency_key: idempotencyKey,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar pagamento");
      }

      return response.json();
    },
  });
}

/**
 * Confirm a payment and update service request status
 */
export function useConfirmPayment() {
  return useMutation({
    mutationFn: async ({
      broadcastId,
      paymentIntentId,
    }: {
      broadcastId: string;
      paymentIntentId: string;
    }) => {
      const { error } = await supabase
        .from("payments")
        .update({ status: "succeeded" })
        .eq("service_request_id", broadcastId)
        .eq("stripe_payment_intent", paymentIntentId);

      if (error) throw error;

      // Update broadcast request status to move forward in pipeline
      // Broadcast moves from 'pending' → 'payment_pending' → 'accepted'
      const { error: updateError } = await supabase
        .from("service_requests")
        .update({ status: "pending" }) // Now ready for professional to accept
        .eq("id", broadcastId);

      if (updateError) throw updateError;
    },
  });
}

/**
 * Fetch payment status for a broadcast
 */
export function usePaymentStatus(broadcastId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payment-status", broadcastId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("service_request_id", broadcastId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!broadcastId && !!user,
  });
}

/**
 * Get earnings summary for a professional
 */
export function useProfessionalEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["professional-earnings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_earnings")
        .select("*")
        .eq("professional_id", user!.id)
        .single();

      if (error) throw error;
      return data
        ? {
            total_services: data.total_services,
            total_earned_cents: data.total_earned_cents,
            total_paid_cents: data.total_paid_cents,
            pending_cents: data.pending_cents,
          }
        : null;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

/**
 * Format cents to BRL currency
 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
