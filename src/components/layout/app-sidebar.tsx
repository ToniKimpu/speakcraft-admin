"use client";

import {
  BookOpen,
  CalendarDays,
  Coins,
  CreditCard,
  Headphones,
  LogOut,
  MessagesSquare,
  Smartphone,
  SpellCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/lib/actions/auth";

const navItems = [
  { title: "Days", href: "/days", icon: CalendarDays },
  { title: "Users", href: "/users", icon: Users },
  { title: "Listening", href: "/listening", icon: Headphones },
  { title: "Daily Speaking", href: "/daily-speaking", icon: MessagesSquare },
  { title: "SYM Budget", href: "/sym-budget", icon: Coins },
  { title: "Grammar", href: "/grammar", icon: SpellCheck },
  { title: "App Versions", href: "/app-versions", icon: Smartphone },
  { title: "Payments", href: "/payments", icon: CreditCard },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader className="px-4 py-3 group-data-[collapsible=icon]:px-0">
        <Link
          href="/days"
          className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
            PMP English
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Content</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <form action={logoutAction}>
              <SidebarMenuButton
                tooltip="Sign Out"
                onClick={(e) => {
                  e.preventDefault();
                  (
                    e.currentTarget.closest("form") as HTMLFormElement
                  )?.requestSubmit();
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
