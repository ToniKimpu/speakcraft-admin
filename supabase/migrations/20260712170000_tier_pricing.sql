-- Move pricing from payment_methods to the TIER (plan).
--
-- WHY
-- Tying price to a payment_method forces one method per (tier × channel) — e.g.
-- KPay-Standard, KPay-Pro, Wave-Standard, Wave-Pro. That's silly. A payment
-- method is just a DESTINATION (a KPay/Wave account you send money to); the
-- PRICE belongs to the tier the buyer chooses. subscription_plans already has
-- tier + price_cents, so it's the natural home.
--
-- After this:
--   * Each tier plan carries its own price (Standard 25,000 / Pro 50,000 MMK —
--     edit anytime from the admin).
--   * The buyer picks a tier (with its price), then any destination to pay to.
--   * payment_methods.amount / plan_code become irrelevant to the buy flow
--     (kept as columns so existing submission history stays valid; the amount
--     default lets the admin create a destination without a price).

-- 1. Tier prices (initial values — admin-editable). price_cents holds the whole
--    MMK amount (MMK has no minor unit).
UPDATE public.subscription_plans SET price_cents = 25000, currency = 'MMK'
 WHERE code = 'standard_12_month';
UPDATE public.subscription_plans SET price_cents = 50000, currency = 'MMK'
 WHERE code = '12_month';

-- 2. Sell exactly two tiers, both 1-year, so the choice is unambiguous. Keep
--    only the two 12-month plans active; deactivate the other durations (unused;
--    no PAST grant is affected — those users' premium_until is already set).
UPDATE public.subscription_plans SET is_active = false
 WHERE code IN ('monthly', '6_month', 'standard_monthly', 'standard_6_month');

-- 3. A payment method no longer needs a price → let inserts omit amount.
ALTER TABLE public.payment_methods ALTER COLUMN amount SET DEFAULT 0;
