'use client'; // Add 'use client' for onClick handlers

import Link from 'next/link'; // Import Link for navigation
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Settings, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast

export function AppHeader() {
  const { toast } = useToast(); // Initialize toast

  const handleProfileClick = () => {
    // Placeholder for profile action, could navigate or open a dropdown
    toast({ title: "Action Required", description: "Implement profile functionality (e.g., dropdown, navigation)." });
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-16 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      {/* Wrap title in a link to the dashboard */}
      <Link href="/" className="flex items-center gap-2">
         <h1 className="text-lg font-semibold sm:text-xl">AlgoAce Trader</h1>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        {/* Wrap Settings button in a Link to navigate */}
        <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
            </Link>
        </Button>
        {/* Keep Profile button as a button for now, can add dropdown later */}
        <Button variant="ghost" size="icon" onClick={handleProfileClick}>
          <User className="h-5 w-5" />
          <span className="sr-only">Profile</span>
        </Button>
      </div>
    </header>
  );
}
