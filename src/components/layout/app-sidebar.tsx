'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  LineChart,
  Settings,
  Terminal,
  LayoutDashboard,
  FileCode,
  History, // Import History icon for Backtesting
  Database, // Import Database icon for Datasets
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/strategies', label: 'Strategies', icon: FileCode },
  { href: '/backtesting', label: 'Backtesting', icon: History },
  { href: '/backtesting/history', label: 'Backtest History', icon: History },
  { href: '/monitoring', label: 'Monitoring', icon: LineChart },
  { href: '/datasets', label: 'Datasets', icon: Database },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/cli', label: 'CLI Control', icon: Terminal },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
       {/* Sidebar Header removed for cleaner look, trigger moved to main header */}
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
                variant="default" // Use default variant for consistent look
                className={cn(
                  "justify-start", // Align text left
                   pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground" // Custom active/hover styles
                )}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
       {/* Sidebar Footer removed as not needed for this design */}
    </Sidebar>
  );
}
