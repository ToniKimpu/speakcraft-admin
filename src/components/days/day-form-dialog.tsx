"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { dayFormSchema, type DayFormValues } from "@/lib/validations/day";
import { useCreateDay, useUpdateDay } from "@/lib/queries/days";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Day } from "@/types/database.types";

interface DayFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day?: Day | null;
}

export function DayFormDialog({ open, onOpenChange, day }: DayFormDialogProps) {
  const isEditing = !!day;
  const createDay = useCreateDay();
  const updateDay = useUpdateDay();
  const isLoading = createDay.isPending || updateDay.isPending;

  const form = useForm<DayFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dayFormSchema) as any,
    defaultValues: {
      order_number: day?.order_number ?? 1,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ order_number: day?.order_number ?? 1 });
    }
  }, [open, day, form]);

  async function onSubmit(values: DayFormValues) {
    if (isEditing && day) {
      await updateDay.mutateAsync({
        id: day.id,
        orderNumber: values.order_number,
      });
    } else {
      await createDay.mutateAsync(values.order_number);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Day" : "Create Day"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Number <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
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
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
