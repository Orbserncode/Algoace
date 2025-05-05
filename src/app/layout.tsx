import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans'; // Correct import for GeistSans
import './globals.css';
import { cn } from '@/lib/utils';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// Removed Geist Mono as it wasn't explicitly used or requested for this app style

export const metadata: Metadata = {
  title: 'AlgoAce Trader',
  description: 'Multi-agent hedge fund trading platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          GeistSans.variable // Use the variable directly from GeistSans
        )}
      >
        <SidebarProvider defaultOpen={true} collapsible="icon">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          </div>
        </SidebarProvider>
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
