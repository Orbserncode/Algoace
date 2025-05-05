'use client'; // Add 'use client' for onClick handler

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { StrategyTable } from './_components/strategy-table'; // Placeholder component
import { AutomatedGenerationForm } from './_components/automated-generation-form'; // Placeholder component
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Dummy data for strategies
const strategies = [
  { id: 'strat-001', name: 'Momentum Burst', description: 'Captures short-term price surges.', status: 'Active', pnl: 1250.75, winRate: 65.2 },
  { id: 'strat-002', name: 'Mean Reversion Scalper', description: 'Trades price deviations from the mean.', status: 'Inactive', pnl: -340.10, winRate: 48.9 },
  { id: 'strat-003', name: 'AI Trend Follower', description: 'Uses ML to identify and follow trends.', status: 'Active', pnl: 3105.00, winRate: 72.1 },
  { id: 'strat-004', name: 'Arbitrage Finder', description: 'Exploits price differences across exchanges.', status: 'Debugging', pnl: 0, winRate: 0 },
];


export default function StrategiesPage() {
    const { toast } = useToast(); // Initialize toast

    const handleAddNewStrategy = () => {
        toast({ title: "Action Required", description: "Implement 'Add New Strategy' functionality (e.g., open a form/modal)." });
        // TODO: Implement logic to add a new strategy, likely opening a form or modal
    };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Manage Strategies</CardTitle>
            <CardDescription>View, configure, and manage your trading strategies.</CardDescription>
          </div>
          <Button size="sm" onClick={handleAddNewStrategy}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Strategy
          </Button>
        </CardHeader>
        <CardContent>
          {/* Pass the strategies data to the table */}
          <StrategyTable strategies={strategies} />
        </CardContent>
      </Card>

      <Card id="automated-generation">
        <CardHeader>
          <CardTitle>Automated Strategy Generation</CardTitle>
          <CardDescription>Configure the AI agent to automatically generate and test new strategies.</CardDescription>
        </CardHeader>
        <CardContent>
           {/* The form itself handles its submission */}
           <AutomatedGenerationForm />
        </CardContent>
      </Card>
    </div>
  );
}
