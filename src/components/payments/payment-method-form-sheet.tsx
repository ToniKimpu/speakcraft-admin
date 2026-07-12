"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  paymentMethodFormSchema,
  type PaymentMethodFormValues,
} from "@/lib/validations/payment";
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from "@/lib/queries/payment-methods";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { QrUpload } from "@/components/payments/qr-upload";
import type { PaymentMethod } from "@/types/database.types";

const TYPE_OPTIONS = [
  { value: "kpay", label: "KBZPay (KPay)" },
  { value: "wave", label: "WavePay" },
  { value: "bank", label: "Bank transfer" },
  { value: "other", label: "Other" },
];

interface PaymentMethodFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  method?: PaymentMethod | null;
}

export function PaymentMethodFormSheet({
  open,
  onOpenChange,
  method,
}: PaymentMethodFormSheetProps) {
  const isEditing = !!method;
  const create = useCreatePaymentMethod();
  const update = useUpdatePaymentMethod();
  const isLoading = create.isPending || update.isPending;

  const form = useForm<PaymentMethodFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentMethodFormSchema) as any,
    defaultValues: {
      type: method?.type ?? "kpay",
      display_name: method?.display_name ?? "",
      account_name: method?.account_name ?? "",
      account_number: method?.account_number ?? "",
      qr_object_path: method?.qr_object_path ?? null,
      instructions: method?.instructions ?? "",
      is_active: method?.is_active ?? true,
      sort_order: method?.sort_order ?? 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        type: method?.type ?? "kpay",
        display_name: method?.display_name ?? "",
        account_name: method?.account_name ?? "",
        account_number: method?.account_number ?? "",
        qr_object_path: method?.qr_object_path ?? null,
        instructions: method?.instructions ?? "",
        is_active: method?.is_active ?? true,
        sort_order: method?.sort_order ?? 0,
      });
    }
  }, [open, method, form]);

  async function onSubmit(values: PaymentMethodFormValues) {
    const payload = {
      ...values,
      instructions: values.instructions?.trim() ? values.instructions : null,
      qr_object_path: values.qr_object_path || null,
    };
    if (isEditing && method) {
      await update.mutateAsync({ id: method.id, values: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit payment method" : "Add payment method"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the destination users pay to."
              : "Add a destination (KPay number, bank account, …) users pay to."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="space-y-5">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Display name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. KBZPay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Account name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Account holder name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Account / phone number{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="09xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                This is just a destination users pay to. The price is set per
                tier in <span className="font-medium">Tier pricing</span>, so a
                single KPay/Wave account serves both Standard and Pro.
              </p>

              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Optional notes shown to the user (e.g. include your account id in the transfer note)."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qr_object_path"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR code (optional)</FormLabel>
                    <FormControl>
                      <QrUpload
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort order</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end gap-2">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SheetBody>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Create"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
