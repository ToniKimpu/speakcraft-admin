"use client";

import { useEffect, useState } from "react";
import { Crown, Loader2, Sparkles } from "lucide-react";

import {
  useSubscriptionPlans,
  useUpdatePlanPrice,
} from "@/lib/queries/subscriptions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SubscriptionPlan } from "@/types/database.types";

/**
 * Edit the price of each tier. Price now lives on the tier (plan), not on the
 * payment method — so one KPay/Wave account can serve both Standard and Pro. The
 * buyer picks a tier (with its price) then any destination to pay to.
 */
export function TierPricingCard() {
  const { data: plans, isLoading } = useSubscriptionPlans();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <h3 className="text-sm font-semibold">Tier pricing</h3>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        The price a user pays for each tier (1 year). Applies to every payment
        method automatically.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          {(plans ?? []).map((plan) => (
            <TierPriceRow key={plan.id} plan={plan} />
          ))}
          {(plans?.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground">
              No active tiers. Apply the tier-pricing migration.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TierPriceRow({ plan }: { plan: SubscriptionPlan }) {
  const update = useUpdatePlanPrice();
  const [price, setPrice] = useState<string>(String(plan.price_cents ?? 0));
  const isPro = plan.tier === "pro";

  // Keep in sync if the query refetches.
  useEffect(() => {
    setPrice(String(plan.price_cents ?? 0));
  }, [plan.price_cents]);

  const dirty = Number(price) !== plan.price_cents;

  return (
    <div className="flex-1 rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant={isPro ? "success" : "warning"} className="gap-1">
          {isPro ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {isPro ? "Pro" : "Standard"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {isPro ? "content + import + AI" : "content only"}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Price ({plan.currency})
          </label>
          <Input
            type="number"
            min={0}
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          onClick={() =>
            update.mutate({ code: plan.code, priceCents: Number(price) || 0 })
          }
        >
          {update.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
