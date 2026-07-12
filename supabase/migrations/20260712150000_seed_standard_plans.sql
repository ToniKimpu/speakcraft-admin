-- Seed Standard-tier plans so the admin can sell the two tiers.
--
-- Price lives on payment_methods (the amount a user pays), and plan_code links a
-- method to a plan that provides duration + tier. grant_subscription() and
-- approve_payment_submission() already route through plan_code, so once a
-- Standard plan exists and a Standard payment method points at it, the whole
-- grant/approval flow is tier-correct with no further code changes.
--
-- The existing plans (monthly / 6_month / 12_month) were tagged tier='pro' by
-- 20260712140000 (they always sold "everything"). Rename them for admin clarity
-- and add the Standard equivalents. plan.name is admin-facing only — the apps
-- label tiers themselves and show payment_methods.display_name — so renaming is
-- safe. price_cents stays 0 (unused by the manual screenshot flow; price is on
-- the payment method).

UPDATE public.subscription_plans SET name = 'Pro — Monthly'   WHERE code = 'monthly';
UPDATE public.subscription_plans SET name = 'Pro — 6 Months'  WHERE code = '6_month';
UPDATE public.subscription_plans SET name = 'Pro — 12 Months' WHERE code = '12_month';

INSERT INTO public.subscription_plans (code, name, duration_days, tier)
VALUES
  ('standard_monthly',  'Standard — Monthly',   30,  'standard'),
  ('standard_6_month',  'Standard — 6 Months',  182, 'standard'),
  ('standard_12_month', 'Standard — 12 Months', 365, 'standard')
ON CONFLICT (code) DO NOTHING;
