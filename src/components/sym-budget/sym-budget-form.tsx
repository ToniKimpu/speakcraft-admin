"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  symBudgetFormSchema,
  type SymBudgetFormValues,
} from "@/lib/validations/sym-budget";
import {
  useSymBudgetConfig,
  useUpdateSymBudgetConfig,
} from "@/lib/queries/sym-budget";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

// Each AI feedback check costs roughly this many tokens.
const TOKENS_PER_CHECK = 1800;

function checksLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const checks = Math.floor(n / TOKENS_PER_CHECK);
  return `≈ ${checks} feedback check${checks === 1 ? "" : "s"}/day (~${TOKENS_PER_CHECK.toLocaleString()} tokens each)`;
}

const DEFAULTS: SymBudgetFormValues = {
  free_trial_daily: 10000,
  free_daily: 5000,
  trial_days: 3,
  premium_daily: 15000,
};

export function SymBudgetForm() {
  const { data, isLoading, isError, error } = useSymBudgetConfig();
  const update = useUpdateSymBudgetConfig();

  const form = useForm<SymBudgetFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(symBudgetFormSchema) as any,
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (data) {
      form.reset({
        free_trial_daily: data.free_trial_daily,
        free_daily: data.free_daily,
        trial_days: data.trial_days,
        premium_daily: data.premium_daily,
      });
    }
  }, [data, form]);

  // Live token values for the helper text.
  const freeTrialDaily = useWatch({
    control: form.control,
    name: "free_trial_daily",
  });
  const freeDaily = useWatch({ control: form.control, name: "free_daily" });
  const premiumDaily = useWatch({
    control: form.control,
    name: "premium_daily",
  });

  async function onSubmit(values: SymBudgetFormValues) {
    await update.mutateAsync(values);
    form.reset(values);
  }

  if (isLoading) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Speak Your Mind — Token Budgets</CardTitle>
          <CardDescription>
            Daily token allowances for the AI feedback feature.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Speak Your Mind — Token Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load config: {(error as Error)?.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Speak Your Mind — Token Budgets</CardTitle>
            <CardDescription>
              Daily token allowances for the AI feedback feature. One AI feedback
              check costs about {TOKENS_PER_CHECK.toLocaleString()} tokens.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="free_trial_daily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Free trial daily{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Free tokens/day during the trial. Default 10,000.{" "}
                    {checksLabel(freeTrialDaily)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="free_daily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Free daily <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Free tokens/day after the trial. Default 5,000.{" "}
                    {checksLabel(freeDaily)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trial_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Trial days <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Length of the full-rate free trial, in days. Default 3. After
                    this many days, new users drop to the &ldquo;Free daily&rdquo;
                    rate.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="premium_daily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Premium daily <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={1} step={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Premium tokens/day. Default 15,000.{" "}
                    {checksLabel(premiumDaily)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => data && form.reset(data)}
              disabled={update.isPending || !form.formState.isDirty}
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={update.isPending || !form.formState.isDirty}
            >
              {update.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
