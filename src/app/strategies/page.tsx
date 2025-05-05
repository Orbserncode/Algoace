import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { StrategyTable } from './_components/strategy-table'; // Placeholder component
import { AutomatedGenerationForm } from './_components/automated-generation-form'; // Placeholder component

// Dummy data for strategies
const strategies = [
  { id: 'strat-001', name: 'Momentum Burst', description: 'Captures short-term price surges.', status: 'Active', pnl: 1250.75, winRate: 65.2 },
  { id: 'strat-002', name: 'Mean Reversion Scalper', description: 'Trades price deviations from the mean.', status: 'Inactive', pnl: -340.10, winRate: 48.9 },
  { id: 'strat-003', name: 'AI Trend Follower', description: 'Uses ML to identify and follow trends.', status: 'Active', pnl: 3105.00, winRate: 72.1 },
  { id: 'strat-004', name: 'Arbitrage Finder', description: 'Exploits price differences across exchanges.', status: 'Debugging', pnl: 0, winRate: 0 },
];


export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Manage Strategies</CardTitle>
            <CardDescription>View, configure, and manage your trading strategies.</CardDescription>
          </div>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Strategy
          </Button>
        </CardHeader>
        <CardContent>
          {/* Placeholder for strategy list/table */}
          <StrategyTable strategies={strategies} />
        </CardContent>
      </Card>

      <Card id="automated-generation">
        <CardHeader>
          <CardTitle>Automated Strategy Generation</CardTitle>
          <CardDescription>Configure the AI agent to automatically generate and test new strategies.</CardDescription>
        </CardHeader>
        <CardContent>
           {/* Placeholder for automated generation config form */}
           <AutomatedGenerationForm />
        </CardContent>
      </Card>
    </div>
  );
}
