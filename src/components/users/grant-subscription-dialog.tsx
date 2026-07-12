"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  grantSubscriptionSchema,
  type GrantSubscriptionValues,
} from "@/lib/validations/subscription";
import { useSubscriptionPlans, useGrantSubscription } from "@/lib/queries/subscriptions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { isPremium } from "@/components/users/users-table-columns";
import type { User } from "@/types/database.types";

interface GrantSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function GrantSubscriptionDialog({
  open,
  onOpenChange,
  user,
}: GrantSubscriptionDialogProps) {
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const grant = useGrantSubscription();

  const form = useForm<GrantSubscriptionValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(grantSubscriptionSchema) as any,
    defaultValues: { plan_code: "", payment_ref: "", note: "" },
  });

  useEffect(() => {
    if (open) form.reset({ plan_code: "", payment_ref: "", note: "" });
  }, [open, form]);

  async function onSubmit(values: GrantSubscriptionValues) {
    if (!user) return;
    await grant.mutateAsync({
      userId: user.id,
      planCode: values.plan_code,
      paymentRef: values.payment_ref,
      note: values.note,
    });
    onOpenChange(false);
  }

  const alreadyPremium = user ? isPremium(user) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Grant premium (manual)</DialogTitle>
          <DialogDescription>
            {user?.email}
            {alreadyPremium && user?.premium_until
              ? ` — already premium until ${new Date(
                  user.premium_until
                ).toLocaleDateString()}. New time stacks on top.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          For comps or off-app payments. Screenshot payments from users are
          handled in <span className="font-medium">Payments → Review queue</span>.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="plan_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Plan <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            plansLoading ? "Loading plans…" : "Select a plan"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.code}>
                          <span className="inline-flex items-center gap-2">
                            <Badge
                              variant={plan.tier === "pro" ? "success" : "warning"}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {plan.tier === "pro" ? "PRO" : "STANDARD"}
                            </Badge>
                            {plan.name} ({plan.duration_days} days)
                          </span>
                        </SelectItem>
                      ))}
                      {!plansLoading && (plans?.length ?? 0) === 0 && (
                        <div className="px-2 py-2 text-sm text-muted-foreground">
                          No plans found. Apply the subscriptions migration.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const code = form.watch("plan_code");
              const plan = plans?.find((p) => p.code === code);
              if (!plan) return null;
              const pro = plan.tier === "pro";
              return (
                <div className="flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <span>Grants</span>
                  <Badge variant={pro ? "success" : "warning"} className="px-1.5 py-0 text-[10px]">
                    {pro ? "PRO" : "STANDARD"}
                  </Badge>
                  <span>
                    {pro
                      ? "— all content + video import + AI feedback"
                      : "— all content (no import / AI feedback)"}{" "}
                    for {plan.duration_days} days.
                  </span>
                </div>
              );
            })()}
            <FormField
              control={form.control}
              name="payment_ref"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment reference</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="KBZPay / bank txn id"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional note"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={grant.isPending}>
                {grant.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Grant premium
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
