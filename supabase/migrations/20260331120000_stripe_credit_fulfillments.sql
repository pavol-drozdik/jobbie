-- Idempotent application of credit purchases from Stripe (webhook + client confirm).
CREATE TABLE IF NOT EXISTS public.stripe_credit_fulfillments (
  payment_intent_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_credit_fulfillments_user_id ON public.stripe_credit_fulfillments (user_id);

ALTER TABLE public.stripe_credit_fulfillments ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_credit_fulfillments IS 'One row per succeeded PaymentIntent for credit packs; prevents double-crediting.';
