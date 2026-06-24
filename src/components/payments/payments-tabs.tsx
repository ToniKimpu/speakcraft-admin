"use client";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentSubmissionsTable } from "@/components/payments/payment-submissions-table";
import { PaymentMethodsTable } from "@/components/payments/payment-methods-table";

export function PaymentsTabs() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Review payment screenshots and manage payment methods."
      />

      <Tabs defaultValue="review">
        <TabsList>
          <TabsTrigger value="review">Review queue</TabsTrigger>
          <TabsTrigger value="methods">Payment methods</TabsTrigger>
        </TabsList>

        <TabsContent value="review" className="mt-6">
          <PaymentSubmissionsTable />
        </TabsContent>

        <TabsContent value="methods" className="mt-6">
          <PaymentMethodsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
