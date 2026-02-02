-- Migration: Stripe Credit Purchase Integration
-- Adds tables and functions for credit pack purchases via Stripe

-- Credit packs configuration table
CREATE TABLE public.credit_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    stripe_price_id TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on credit_packs (public read, admin write)
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active credit packs"
    ON public.credit_packs FOR SELECT
    USING (active = true);

-- Purchase history table
CREATE TABLE public.purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credit_pack_id UUID REFERENCES public.credit_packs(id),
    stripe_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent_id TEXT,
    amount_cents INTEGER NOT NULL,
    credits_granted INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS on purchases
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
    ON public.purchases FOR SELECT
    USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_purchases_user_id ON public.purchases(user_id);
CREATE INDEX idx_purchases_stripe_session_id ON public.purchases(stripe_session_id);

-- Function to grant purchased credits atomically
-- Called by the webhook handler after successful payment
CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_purchase_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Add credits to user balance
    UPDATE public.credits
    SET
        balance = balance + p_amount,
        lifetime_granted = lifetime_granted + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log the transaction
    INSERT INTO public.credit_transactions (
        user_id,
        amount,
        transaction_type,
        description
    )
    VALUES (
        p_user_id,
        p_amount,
        'purchase',
        'Credit pack purchase'
    );

    -- Update purchase status
    UPDATE public.purchases
    SET status = 'completed', completed_at = NOW()
    WHERE id = p_purchase_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial credit packs
-- Note: stripe_price_id values are placeholders - update with real Stripe Price IDs
INSERT INTO public.credit_packs (name, credits, price_cents, stripe_price_id, sort_order) VALUES
    ('Starter Pack', 100, 500, 'price_starter_placeholder', 1),
    ('Value Pack', 500, 2000, 'price_value_placeholder', 2),
    ('Pro Pack', 1000, 3500, 'price_pro_placeholder', 3);
