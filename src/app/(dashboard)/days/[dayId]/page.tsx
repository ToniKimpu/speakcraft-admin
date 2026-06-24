"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDay } from "@/lib/queries/days";
import { useUIStore } from "@/stores/ui-store";
import { PageHeader } from "@/components/shared/page-header";
import { DayDetailTabs } from "@/components/days/day-detail-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarDays, Hash, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DayDetailPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId: dayIdStr } = use(params);
  const dayId = Number(dayIdStr);
  const router = useRouter();
  const { data: day, isLoading } = useDay(dayId);
  const setBreadcrumbLabel = useUIStore((s) => s.setBreadcrumbLabel);

  useEffect(() => {
    if (day) {
      setBreadcrumbLabel("days", day.id, `Day ${day.order_number}`);
    }
  }, [day, setBreadcrumbLabel]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!day) return <p>Day not found.</p>;

  return (
    <div className="space-y-4">
      <PageHeader title={`Day ${day.order_number}`}>
        <Button variant="outline" onClick={() => router.push("/days")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Days
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Hash className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Order Number</p>
              <p className="text-lg font-semibold">{day.order_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={day.is_deleted ? "destructive" : "success"} className="mt-0.5">
                {day.is_deleted ? "Deleted" : "Active"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium">
                {new Date(day.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DayDetailTabs dayId={dayId} />
    </div>
  );
}
