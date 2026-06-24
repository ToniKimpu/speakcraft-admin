"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useUIStore } from "@/stores/ui-store";
import { Fragment } from "react";

type Segment = {
  label: string;
  href: string;
};

const ENTITY_SEGMENTS: Record<string, { table: string; labelField: string }> = {
  days: { table: "days", labelField: "order_number" },
  lessons: { table: "lessons", labelField: "lesson_name" },
  patterns: { table: "patterns", labelField: "pattern" },
  exercises: { table: "exercises", labelField: "exercise_name" },
  listening: { table: "listenings", labelField: "title" },
};

export function BreadcrumbNav() {
  const pathname = usePathname();
  const getBreadcrumbLabel = useUIStore((s) => s.getBreadcrumbLabel);
  const parts = pathname.split("/").filter(Boolean);

  const segments: Segment[] = [];
  let currentPath = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath += `/${part}`;

    // Check if the previous part was a known entity category
    const prevPart = i > 0 ? parts[i - 1] : null;
    const isId = prevPart && ENTITY_SEGMENTS[prevPart] && !isNaN(Number(part));

    if (isId && prevPart) {
      const config = ENTITY_SEGMENTS[prevPart];
      const cached = getBreadcrumbLabel(config.table, Number(part));
      const label = cached || `#${part}`;

      // Replace the previous "Days" / "Lessons" etc. segment by keeping it but making
      // this ID segment the more specific one
      segments.push({ label, href: currentPath });
    } else if (ENTITY_SEGMENTS[part]) {
      // This is a category like "days", "lessons"
      const label = part.charAt(0).toUpperCase() + part.slice(1);
      segments.push({ label, href: currentPath });
    }
  }

  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <Fragment key={segment.href}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === segments.length - 1 ? (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={segment.href} />}>
                  {segment.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
