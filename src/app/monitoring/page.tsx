import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PerformanceChart } from './_components/performance-chart'; // Placeholder chart
import { ActivityLog } from './_components/activity-log'; // Placeholder log

// Mock data for chart and log
const chartData = [
  { date: '2024-01-01', portfolioValue: 10000, profit: 0 },
  { date: '2024-01-08', portfolioValue: 10250, profit: 250 },
  { date: '2024-01-15', portfolioValue: 10150, profit: 150 },
  { date: '2024-01-22', portfolioValue: 10500, profit: 500 },
  { date: '2024-01-29', portfolioValue: 10800, profit: 800 },
  { date: '2024-02-05', portfolioValue: 10700, profit: 700 },
  { date: '2024-02-12', portfolioValue: 11100, profit: 1100 },
];

const logData = [
  { timestamp: '2024-02-12 10:30:15', type: 'Trade', message: 'Executed BUY AAPL @ 175.50', strategy: 'Momentum Burst' },
  { timestamp: '2024-02-12 09:45:02', type: 'Signal', message: 'Potential entry signal for MSFT', strategy: 'AI Trend Follower' },
  { timestamp: '2024-02-11 16:00:00', type: 'System', message: 'Daily P&L calculation complete: +$150.23', strategy: 'System' },
  { timestamp: '2024-02-11 14:20:55', type: 'Trade', message: 'Executed SELL GOOGL @ 148.10', strategy: 'Mean Reversion Scalper (Inactive)' },
  { timestamp: '2024-02-11 09:00:01', type: 'System', message: 'Market data connection established.', strategy: 'System' },
];


export default function MonitoringPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Overall portfolio value and profit/loss over time.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
           <PerformanceChart data={chartData} />
        </CardContent>
      </Card>

       <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Real-time log of trades, signals, and system events.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog logs={logData} />
        </CardContent>
      </Card>

       <Card className="lg:col-span-1">
         <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Snapshot of important performance indicators.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Total P&L:</span>
                 <span className="font-semibold text-green-600 dark:text-green-400">$1,100.00</span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Today's P&L:</span>
                 <span className="font-semibold text-red-600 dark:text-red-400">-$50.75</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Active Strategies:</span>
                 <span className="font-semibold">2</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Total Trades Today:</span>
                 <span className="font-semibold">5</span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Win Rate (Last 7d):</span>
                 <span className="font-semibold">68.4%</span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Max Drawdown:</span>
                 <span className="font-semibold">8.2%</span>
             </div>
         </CardContent>
       </Card>

    </div>
  );
}
