// src/app/monitoring/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PerformanceChart } from './_components/performance-chart';
import { ActivityLog } from './_components/activity-log';
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Eye, ArrowLeft } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    getPortfolioHistory,
    getActivityLogs,
    getKeyMetrics,
    getStrategyPerformance, // Import strategy-specific function
    getStrategyTrades, // Add missing import
    PerformanceDataPoint,
    LogEntry,
    KeyMetrics,
} from '@/services/monitoring-service';
import { getStrategies, Strategy } from '@/services/strategies-service'; // To list strategies for selection
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StrategyTradesTable } from './_components/strategy-trades-table'; // New component for trades
import type { Trade } from '@/services/monitoring-service'; // Import Trade type

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

type ViewMode = 'portfolio' | 'strategy';

export default function MonitoringPage() {
  // Overall Portfolio Data
  const [portfolioChartData, setPortfolioChartData] = useState<PerformanceDataPoint[]>([]);
  const [logData, setLogData] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Partial<KeyMetrics>>({});

  // Strategy Specific Data
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [strategyChartData, setStrategyChartData] = useState<PerformanceDataPoint[]>([]);
  const [strategyTrades, setStrategyTrades] = useState<Trade[]>([]);
  const [strategyTotalTrades, setStrategyTotalTrades] = useState(0); // For pagination

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('portfolio');
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingStrategyData, setIsLoadingStrategyData] = useState(false); // Separate loading for strategy view
  const [error, setError] = useState<string | null>(null);

  // Pagination state for trades table
  const [tradePage, setTradePage] = useState(1);
  const tradeRowsPerPage = 20; // Show 20 trades per page

  // Fetch initial data (portfolio overview and strategy list)
  const loadInitialData = async () => {
        setIsLoadingPortfolio(true);
        setIsLoadingLogs(true);
        setIsLoadingMetrics(true);
        setIsLoadingStrategies(true);
        setError(null);

        try {
            // Fetch all initial data concurrently
            const [fetchedChartData, fetchedLogData, fetchedMetrics, fetchedStrategies] = await Promise.all([
                getPortfolioHistory('1M'),
                getActivityLogs(50),
                getKeyMetrics(),
                getStrategies(false) // Fetch only active/inactive strategies for selection
            ]);
            setPortfolioChartData(fetchedChartData);
            setLogData(fetchedLogData);
            setMetrics(fetchedMetrics);
            setStrategies(fetchedStrategies);
        } catch (err) {
            console.error("Failed to fetch initial monitoring data:", err);
            setError("Failed to load initial monitoring data. Please try again later.");
        } finally {
            setIsLoadingPortfolio(false);
            setIsLoadingLogs(false);
            setIsLoadingMetrics(false);
            setIsLoadingStrategies(false);
        }
    };

   useEffect(() => {
     loadInitialData();
     // Optional: Set up polling for some data?
   }, []);

    // Fetch data for the selected strategy when ID changes
    useEffect(() => {
        const loadStrategySpecificData = async () => {
             if (!selectedStrategyId) {
                setViewMode('portfolio'); // Go back to portfolio view if no strategy selected
                 return;
             };

            setIsLoadingStrategyData(true);
            setViewMode('strategy'); // Switch view
            setError(null); // Clear previous errors

            try {
                 // Fetch performance and trades for the selected strategy (reset page to 1)
                 setTradePage(1); // Reset page when strategy changes
                 const offset = 0; // Start from the first page
                const [perfData, tradesData] = await Promise.all([
                    getStrategyPerformance(selectedStrategyId, '1M'), // Or use a selectable time range
                    getStrategyTrades(selectedStrategyId, tradeRowsPerPage, offset)
                ]);
                setStrategyChartData(perfData);
                setStrategyTrades(tradesData.trades);
                setStrategyTotalTrades(tradesData.total);
            } catch (err) {
                 console.error(`Failed to fetch data for strategy ${selectedStrategyId}:`, err);
                 setError(`Failed to load data for the selected strategy. ${err instanceof Error ? err.message : ''}`);
                 // Optionally switch back to portfolio view on error?
                 // setViewMode('portfolio');
                 // setSelectedStrategyId(null);
            } finally {
                setIsLoadingStrategyData(false);
            }
        };

        loadStrategySpecificData();
    }, [selectedStrategyId]); // Run when selectedStrategyId changes


    // Fetch trades for the current strategy when page changes
    useEffect(() => {
         const loadTradesForPage = async () => {
             if (viewMode !== 'strategy' || !selectedStrategyId) return;

             setIsLoadingStrategyData(true); // Use same loading indicator for simplicity
             setError(null);

             const offset = (tradePage - 1) * tradeRowsPerPage;

             try {
                 const tradesData = await getStrategyTrades(selectedStrategyId, tradeRowsPerPage, offset);
                 setStrategyTrades(tradesData.trades);
                 setStrategyTotalTrades(tradesData.total); // Ensure total is updated if needed
             } catch (err) {
                 console.error(`Failed to fetch trades for page ${tradePage} of strategy ${selectedStrategyId}:`, err);
                 setError(`Failed to load trades for the selected page. ${err instanceof Error ? err.message : ''}`);
             } finally {
                 setIsLoadingStrategyData(false);
             }
         };

         // Only run if we are in strategy view and not on initial strategy load (which is handled by the other useEffect)
         if (tradePage > 1 || (tradePage === 1 && strategyTrades.length === 0 && strategyTotalTrades > 0)) {
             loadTradesForPage();
         }
      }, [tradePage, selectedStrategyId, viewMode, strategyTrades.length, strategyTotalTrades]); // Re-run when page changes


  const selectedStrategy = useMemo(() => {
     return strategies.find(s => s.id === selectedStrategyId);
  }, [selectedStrategyId, strategies]);

  const isLoadingAny = isLoadingPortfolio || isLoadingLogs || isLoadingMetrics || isLoadingStrategies;

  if (isLoadingAny && viewMode === 'portfolio') {
       // Show a basic loading state for initial load
       return (
           <div className="flex justify-center items-center min-h-[400px]">
               <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
               <span className="ml-3 text-muted-foreground">Loading monitoring dashboard...</span>
           </div>
       );
  }

    // --- Render Portfolio View ---
    const renderPortfolioView = () => (
        <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
             {/* Strategy Selection Dropdown */}
              <Card className="lg:col-span-3">
                  <CardHeader className="flex-row items-center justify-between pb-2">
                     <div>
                         <CardTitle>Select Strategy</CardTitle>
                         <CardDescription>View detailed performance and trades for a specific strategy.</CardDescription>
                     </div>
                     <Select onValueChange={setSelectedStrategyId} value={selectedStrategyId || ""} disabled={isLoadingStrategies}>
                          <SelectTrigger className="w-[250px]">
                             <SelectValue placeholder="Select a strategy..." />
                          </SelectTrigger>
                          <SelectContent>
                              {isLoadingStrategies && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                              {!isLoadingStrategies && strategies.length === 0 && <SelectItem value="no-strats" disabled>No strategies available</SelectItem>}
                              {!isLoadingStrategies && strategies.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                      {s.name} ({s.status})
                                  </SelectItem>
                              ))}
                          </SelectContent>
                     </Select>
                  </CardHeader>
              </Card>

              {/* Portfolio Performance Chart */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Overall Portfolio Performance</CardTitle>
                  <CardDescription>Portfolio value and cumulative profit/loss over time.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                   {isLoadingPortfolio ? (
                       <div className="h-[300px] flex items-center justify-center">
                         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                       </div>
                   ) : (
                      <PerformanceChart data={portfolioChartData} />
                   )}
                </CardContent>
              </Card>

               {/* Activity Log */}
               <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity Log</CardTitle>
                  <CardDescription>Real-time log of trades, signals, and system events across all strategies.</CardDescription>
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

               {/* Key Metrics */}
               <Card className="lg:col-span-1">
                 <CardHeader>
                    <CardTitle>Key Metrics (Overall)</CardTitle>
                    <CardDescription>Snapshot of important portfolio-wide indicators.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                      {/* Use isLoadingMetrics to show skeletons */}
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Total P&L:</span>
                          <span className={cn(
                             "font-semibold",
                             metrics.totalPnL === undefined ? "" : metrics.totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                             {isLoadingMetrics ? <Skeleton className="h-6 w-20 inline-block" /> : formatCurrency(metrics.totalPnL)}
                         </span>
                     </div>
                      <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Today's P&L:</span>
                           <span className={cn(
                             "font-semibold",
                              metrics.todayPnL === undefined ? "" : metrics.todayPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                              {isLoadingMetrics ? <Skeleton className="h-6 w-16 inline-block" /> : formatCurrency(metrics.todayPnL)}
                           </span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Active Strategies:</span>
                         <span className="font-semibold">{isLoadingMetrics ? <Skeleton className="h-6 w-10 inline-block" /> : formatNumber(metrics.activeStrategies)}</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Total Trades Today:</span>
                         <span className="font-semibold">{isLoadingMetrics ? <Skeleton className="h-6 w-10 inline-block" /> : formatNumber(metrics.totalTradesToday)}</span>
                     </div>
                      <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Win Rate (Last 7d):</span>
                         <span className="font-semibold">{isLoadingMetrics ? <Skeleton className="h-6 w-14 inline-block" /> : formatPercentage(metrics.winRateLast7d)}</span>
                     </div>
                      <div className="flex justify-between items-center">
                         <span className="text-muted-foreground">Max Drawdown:</span>
                         <span className="font-semibold">{isLoadingMetrics ? <Skeleton className="h-6 w-14 inline-block" /> : formatPercentage(metrics.maxDrawdown)}</span>
                     </div>
                 </CardContent>
               </Card>
            </div>
    );

    // --- Render Strategy View ---
    const renderStrategyView = () => {
         if (!selectedStrategy) {
             // Should ideally not happen if selection drives the view, but handle defensively
             return (
                 <div className="flex flex-col items-center justify-center min-h-[400px]">
                     <AlertTriangle className="h-10 w-10 mb-4 text-destructive" />
                     <p className="text-lg mb-4">Selected strategy not found.</p>
                     <Button onClick={() => setSelectedStrategyId(null)} variant="outline">Back to Portfolio View</Button>
                 </div>
             );
         }

         return (
             <div className="space-y-6 animate-fade-in">
                  {/* Header and Back Button */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => setSelectedStrategyId(null)} title="Back to Portfolio View">
                             <ArrowLeft className="h-4 w-4" />
                         </Button>
                         <div>
                             <h2 className="text-2xl font-semibold">{selectedStrategy.name} - Performance</h2>
                             <p className="text-sm text-muted-foreground">{selectedStrategy.description}</p>
                         </div>
                    </div>
                    {/* Add any strategy-specific actions here if needed */}
                 </div>

                  {/* Error Display */}
                 {error && !isLoadingStrategyData && (
                     <Alert variant="destructive">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Error Loading Strategy Data</AlertTitle>
                         <AlertDescription>{error}</AlertDescription>
                     </Alert>
                 )}

                  {/* Strategy Performance Chart */}
                 <Card>
                    <CardHeader>
                        <CardTitle>Strategy Performance</CardTitle>
                        <CardDescription>Strategy-specific value and profit/loss over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                       {isLoadingStrategyData && !strategyChartData.length ? ( // Show loader only if no data yet
                           <div className="h-[300px] flex items-center justify-center">
                             <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                           </div>
                       ) : (
                          <PerformanceChart data={strategyChartData} />
                       )}
                    </CardContent>
                 </Card>

                  {/* Strategy Trades Table */}
                 <Card>
                     <CardHeader>
                         <CardTitle>Recent Trades</CardTitle>
                         <CardDescription>Trades executed by the "{selectedStrategy.name}" strategy.</CardDescription>
                     </CardHeader>
                     <CardContent>
                          {isLoadingStrategyData && !strategyTrades.length ? ( // Show loader only if no data yet
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                             <StrategyTradesTable
                                 trades={strategyTrades}
                                 totalTrades={strategyTotalTrades}
                                 page={tradePage}
                                 rowsPerPage={tradeRowsPerPage}
                                 onPageChange={setTradePage}
                             />
                          )}
                     </CardContent>
                 </Card>
             </div>
         );
    };


    // --- Main Render Logic ---
    return (
        <div>
            {viewMode === 'portfolio' ? renderPortfolioView() : renderStrategyView()}

            {/* Add animation utility */}
            <style jsx global>{`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fadeIn 0.5s ease-out forwards;
            }
            `}</style>
        </div>
    );
}

    