import { useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface StripePaymentFormProps {
  clientSecret: string;
  amount: number; // in cents
  onSuccess: () => void;
  onCancel: () => void;
}

declare const Stripe: any;
declare const elements: any;

export function StripePaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onCancel,
}: StripePaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);

  useEffect(() => {
    // Load Stripe.js
    if (!window.Stripe) {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = () => setElementReady(true);
      document.body.appendChild(script);
    } else {
      setElementReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.Stripe) {
      setError("Stripe not loaded");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

      // Confirm payment with Stripe
      const { paymentIntent, error: stripeError } = await stripe.confirmPayment({
        elements: window.elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/solicitar`,
        },
      });

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent?.status === "succeeded") {
        toast.success("Pagamento confirmado!");
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  };

  const amountBRL = (amount / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  if (!elementReady) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 flex items-center justify-center gap-3">
        <Loader2 size={16} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando formulário de pagamento...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Amount display */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
          Valor da solicitação
        </p>
        <p className="text-2xl font-black text-foreground">{amountBRL}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Comissão Fixr (15%): {((amount * 0.15) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </p>
      </div>

      {/* Stripe Elements will render here */}
      <div id="payment-element" className="rounded-xl border border-border bg-card p-4" />

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading || !elementReady}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle size={14} />
              Confirmar pagamento
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 rounded-xl border border-border text-foreground font-black text-sm uppercase tracking-widest hover:bg-muted transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

