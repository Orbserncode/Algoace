// src/app/monitoring/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PerformanceChart } from './_components/performance-chart';
import { ActivityLog } from './_components/activity-log';
import { AgentFeed } from './_components/agent-feed';
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Eye, ArrowLeft } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    getPortfolioHistory,
    getActivityLogs,
    getKeyMetrics,
    getStrategyPerformance, // Import strategy-specific function
    getStrategyTrades, // Add missing import
    getLiveBrokerTrades, // Import live broker trades function
    PerformanceDataPoint,
    LogEntry,
    KeyMetrics,
} from '@/services/monitoring-service';
import { getStrategies, Strategy } from '@/services/strategies-service'; // To list strategies for selection
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StrategyTradesTable } from './_components/strategy-trades-table'; // New component for trades
import { LiveBrokerTradesTable } from './_components/live-broker-trades-table'; // Import live trades component
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

  // Live Broker Trades
  const [liveBrokerTrades, setLiveBrokerTrades] = useState<Trade[]>([]);
  const [isLoadingLiveTrades, setIsLoadingLiveTrades] = useState(false);

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
        setIsLoadingLiveTrades(true);
        setError(null);

        try {
            // Fetch data individually to handle errors for each request
            try {
                const fetchedChartData = await getPortfolioHistory('1M');
                setPortfolioChartData(fetchedChartData);
            } catch (chartErr) {
                console.error("Failed to fetch portfolio history:", chartErr);
                setPortfolioChartData([]);
            }
            
            try {
                const fetchedLogData = await getActivityLogs(50);
                setLogData(fetchedLogData);
            } catch (logErr) {
                console.error("Failed to fetch activity logs:", logErr);
                setLogData([]);
            }
            
            try {
                const fetchedMetrics = await getKeyMetrics();
                setMetrics(fetchedMetrics);
            } catch (metricsErr) {
                console.error("Failed to fetch key metrics:", metricsErr);
                setMetrics({
                    totalPnL: 0,
                    todayPnL: 0,
                    activeStrategies: 0,
                    totalTradesToday: 0,
                    winRateLast7d: 0,
                    maxDrawdown: 0
                });
            }
            
            try {
                const fetchedStrategies = await getStrategies(false);
                setStrategies(fetchedStrategies);
            } catch (strategiesErr) {
                console.error("Failed to fetch strategies:", strategiesErr);
                setStrategies([]);
            }
            
            try {
                const fetchedLiveTrades = await getLiveBrokerTrades();
                setLiveBrokerTrades(fetchedLiveTrades);
            } catch (tradesErr) {
                console.error("Failed to fetch live broker trades:", tradesErr);
                setLiveBrokerTrades([]);
            }
        } catch (err) {
            console.error("Failed to fetch initial monitoring data:", err);
            setError("Failed to load initial monitoring data. Please check your connection and try again later.");
        } finally {
            setIsLoadingPortfolio(false);
            setIsLoadingLogs(false);
            setIsLoadingMetrics(false);
            setIsLoadingStrategies(false);
            setIsLoadingLiveTrades(false);
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
                
                try {
                    const perfData = await getStrategyPerformance(selectedStrategyId, '1M');
                    setStrategyChartData(perfData);
                } catch (perfErr) {
                    console.error(`Failed to fetch performance for strategy ${selectedStrategyId}:`, perfErr);
                    setStrategyChartData([]);
                }
                
                try {
                    const tradesData = await getStrategyTrades(selectedStrategyId, tradeRowsPerPage, offset);
                    setStrategyTrades(tradesData.trades);
                    setStrategyTotalTrades(tradesData.total);
                } catch (tradesErr) {
                    console.error(`Failed to fetch trades for strategy ${selectedStrategyId}:`, tradesErr);
                    setStrategyTrades([]);
                    setStrategyTotalTrades(0);
                }
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
                 setStrategyTrades([]);
             } finally {
                 setIsLoadingStrategyData(false);
             }
         };

         // Only run if we are in strategy view and not on initial strategy load (which is handled by the other useEffect)
         if (tradePage > 1 || (tradePage === 1 && strategyTrades.length === 0 && strategyTotalTrades > 0)) {
             loadTradesForPage();
         }
      }, [tradePage, selectedStrategyId, viewMode, strategyTrades.length, strategyTotalTrades]); // Re-run when page changes
      
  // Function to refresh live broker trades
  const refreshLiveBrokerTrades = async () => {
      setIsLoadingLiveTrades(true);
      try {
          const fetchedLiveTrades = await getLiveBrokerTrades();
          setLiveBrokerTrades(fetchedLiveTrades);
      } catch (err) {
          console.error("Failed to refresh live broker trades:", err);
          setLiveBrokerTrades([]);
      } finally {
          setIsLoadingLiveTrades(false);
      }
  };
  
  // Function to handle trade closure
  const handleTradeClose = (tradeId: string) => {
      // Remove the trade from the list
      setLiveBrokerTrades(prevTrades =>
          prevTrades.filter(trade => trade.id !== tradeId)
      );
  };


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
        <div className="grid gap-6 animate-fade-in">
            <div className="grid grid-cols-12 gap-6">
                {/* Main Content Area (9 columns) */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {/* Strategy Selection Dropdown */}
                    <Card>
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
                    <Card>
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

                    {/* Live Broker Trades Table */}
                    <Card>
                        <CardContent className="pt-6">
                            {/* Import and use the LiveBrokerTradesTable component */}
                            {/* @ts-ignore - Component will be available */}
                            <LiveBrokerTradesTable
                                trades={liveBrokerTrades.slice(0, 10)} // Limit to 10 trades
                                isLoading={isLoadingLiveTrades}
                                onRefresh={refreshLiveBrokerTrades}
                                onTradeClose={handleTradeClose}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar (3 columns) */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    {/* Activity Log - Now in sidebar */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Recent Activity Log</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[300px] overflow-auto">
                            {isLoadingLogs ? (
                                <div className="h-[200px] flex items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <ActivityLog logs={logData} compact={true} />
                            )}
                        </CardContent>
                    </Card>

                    {/* Agent Feed - New component */}
                    <AgentFeed />

                    {/* Key Metrics - Now in sidebar */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Key Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Use isLoadingMetrics to show skeletons */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Total P&L:</span>
                                <span className={cn(
                                    "font-semibold text-sm",
                                    metrics.totalPnL === undefined ? "" : metrics.totalPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {isLoadingMetrics ? <Skeleton className="h-4 w-16 inline-block" /> : formatCurrency(metrics.totalPnL)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Today's P&L:</span>
                                <span className={cn(
                                    "font-semibold text-sm",
                                    metrics.todayPnL === undefined ? "" : metrics.todayPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {isLoadingMetrics ? <Skeleton className="h-4 w-14 inline-block" /> : formatCurrency(metrics.todayPnL)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Active Strategies:</span>
                                <span className="font-semibold text-sm">{isLoadingMetrics ? <Skeleton className="h-4 w-8 inline-block" /> : formatNumber(metrics.activeStrategies)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Trades Today:</span>
                                <span className="font-semibold text-sm">{isLoadingMetrics ? <Skeleton className="h-4 w-8 inline-block" /> : formatNumber(metrics.totalTradesToday)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Win Rate (7d):</span>
                                <span className="font-semibold text-sm">{isLoadingMetrics ? <Skeleton className="h-4 w-12 inline-block" /> : formatPercentage(metrics.winRateLast7d)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                                <span className="font-semibold text-sm">{isLoadingMetrics ? <Skeleton className="h-4 w-12 inline-block" /> : formatPercentage(metrics.maxDrawdown)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
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

    