# Stripe Setup Guide

## 1. Create Stripe Connect Account

1. Go to https://stripe.com
2. Create a business account (Brasil)
3. Complete KYC for your company
4. Accept Stripe Connected Account agreement

## 2. Get API Keys

1. Go to **Dashboard > Developers > API keys**
2. Copy **Publishable key** (starts with `pk_test_` or `pk_live_`)
3. Copy **Secret key** (starts with `sk_test_` or `sk_live_`)

## 3. Set Environment Variables

### Local Development

Add to `.env`:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

Add to `.env.local` (never commit):
```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### Supabase Secrets

Deploy secret to edge function:
```bash
SUPABASE_ACCESS_TOKEN=your_token npx supabase secrets set --project-ref PROJECT_ID STRIPE_SECRET_KEY=sk_test_xxxxx
```

## 4. Deploy Edge Function

```bash
SUPABASE_ACCESS_TOKEN=your_token npx supabase functions deploy create-payment-intent --project-ref PROJECT_ID
```

## 5. Webhook Setup (Production)

1. Supabase Dashboard → Webhooks
2. Create webhook for `payments` table updates
3. Listen for UPDATE events
4. Point to: `https://api.stripe.com/v1/webhooks` (setup in Stripe Dashboard)

**OR**

1. Stripe Dashboard → Developers → Webhooks
2. Create endpoint listening to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
3. Point to Supabase edge function or custom endpoint
4. Update payment status based on webhook

## 6. Merchant Onboarding (Stripe Connect)

For professional payouts, set up Connected Accounts:

```bash
# In a future migration/function:
PATCH /v1/accounts/{account_id}
{
  "type": "express",
  "country": "BR",
  "email": "pro@example.com"
}
```

Store Stripe account ID in `professional_profiles.stripe_account_id`.

## 7. Test Card Numbers

| Card | Status | Number |
|---|---|---|
| Visa | Success | 4242 4242 4242 4242 |
| Visa | Decline | 4000 0000 0000 0002 |
| Mastercard | Success | 5555 5555 5555 4444 |

Use any future date for expiry, any 3-digit CVC.

## References

- [Stripe Docs](https://stripe.com/docs/payments/payment-intents)
- [Stripe Connect](https://stripe.com/docs/connect)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
