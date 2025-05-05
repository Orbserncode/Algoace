'use client'; // Required for useEffect and useState

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PerformanceChart } from './_components/performance-chart';
import { ActivityLog } from './_components/activity-log';
import { Button } from "@/components/ui/button"; // For retry button
import { Loader2, AlertTriangle } from "lucide-react"; // Icons for loading/error
import {
    getPortfolioHistory,
    getActivityLogs,
    getKeyMetrics,
    PerformanceDataPoint,
    LogEntry,
    KeyMetrics
} from '@/services/monitoring-service'; // Import service functions and types
import { Skeleton } from "@/components/ui/skeleton"; // For loading skeletons
import { cn } from '@/lib/utils';


// Helper to format currency
const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return <Skeleton className="h-6 w-20 inline-block" />;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Helper to format percentage
const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return <Skeleton className="h-6 w-16 inline-block" />;
    return `${value.toFixed(1)}%`;
}

// Helper to format numbers
const formatNumber = (value: number | undefined) => {
     if (value === undefined) return <Skeleton className="h-6 w-10 inline-block" />;
     return value.toLocaleString();
}


export default function MonitoringPage() {
  const [chartData, setChartData] = useState<PerformanceDataPoint[]>([]);
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Partial<KeyMetrics>>({}); // Use partial for initial loading state
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
        setIsLoadingChart(true);
        setIsLoadingLogs(true);
        setIsLoadingMetrics(true);
        setError(null);

        try {
            // Fetch all data concurrently
            const [fetchedChartData, fetchedLogData, fetchedMetrics] = await Promise.all([
                getPortfolioHistory('1M'), // Fetch data for the last month
                getActivityLogs(50),      // Fetch recent 50 logs
                getKeyMetrics()
            ]);
            setChartData(fetchedChartData);
            setLogData(fetchedLogData);
            setMetrics(fetchedMetrics);
        } catch (err) {
            console.error("Failed to fetch monitoring data:", err);
            setError("Failed to load monitoring data. Please try again later.");
            // Clear data on error? Optional.
            // setChartData([]);
            // setLogData([]);
            // setMetrics({});
        } finally {
            setIsLoadingChart(false);
            setIsLoadingLogs(false);
            setIsLoadingMetrics(false);
        }
    };


  useEffect(() => {
    loadData();
    // Optional: Set up polling to refresh data periodically
    // const intervalId = setInterval(loadData, 30000); // Refresh every 30 seconds
    // return () => clearInterval(intervalId);
  }, []);

  if (error) {
     return (
         <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
             <AlertTriangle className="h-10 w-10 mb-4" />
             <p className="text-lg mb-4">{error}</p>
             <Button onClick={loadData} variant="outline">Retry Loading Data</Button>
         </div>
     );
  }


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Performance Chart Card */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Portfolio Performance</CardTitle>
          <CardDescription>Overall portfolio value and profit/loss over time.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
           {isLoadingChart ? (
               <div className="h-[300px] flex items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
           ) : (
              <PerformanceChart data={chartData} />
           )}
        </CardContent>
      </Card>

       {/* Activity Log Card */}
       <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Real-time log of trades, signals, and system events.</CardDescription>
        </CardHeader>
        <CardContent>
           {isLoadingLogs ? (
               <div className="h-[400px] flex items-center justify-center">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
               </div>
           ) : (
              <ActivityLog logs={logData} />
           )}
        </CardContent>
      </Card>

       {/* Key Metrics Card */}
       <Card className="lg:col-span-1">
         <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Snapshot of important performance indicators.</CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Total P&L:</span>
                 <span className={cn(
                     "font-semibold",
                     metrics.totalPnL === undefined ? "" : metrics.totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                 )}>
                     {formatCurrency(metrics.totalPnL)}
                 </span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Today's P&L:</span>
                  <span className={cn(
                     "font-semibold",
                      metrics.todayPnL === undefined ? "" : metrics.todayPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                 )}>
                     {formatCurrency(metrics.todayPnL)}
                  </span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Active Strategies:</span>
                 <span className="font-semibold">{formatNumber(metrics.activeStrategies)}</span>
             </div>
             <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Total Trades Today:</span>
                 <span className="font-semibold">{formatNumber(metrics.totalTradesToday)}</span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Win Rate (Last 7d):</span>
                 <span className="font-semibold">{formatPercentage(metrics.winRateLast7d)}</span>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-muted-foreground">Max Drawdown:</span>
                 <span className="font-semibold">{formatPercentage(metrics.maxDrawdown)}</span>
             </div>
         </CardContent>
       </Card>

    </div>
  );
}