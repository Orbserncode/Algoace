// src/app/strategies/_components/backtest-result-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PerformanceChart } from '@/app/monitoring/_components/performance-chart'; // Reuse performance chart
import { summarizeBacktestResults } from '@/ai/flows/summarize-backtest-results'; // Import AI summary flow
import { getBacktestResults, BacktestResults } from '@/services/backtesting-service'; // Import backtesting service
import { Loader2, AlertTriangle, MessageSquareText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Strategy } from '@/services/strategies-service'; // Import Strategy type
import { cn } from '@/lib/utils';

interface BacktestResultDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null; // Pass the full strategy object
}

// Helper to format numbers/currency/percentage
const formatValue = (value: number | undefined, type: 'currency' | 'percentage' | 'number' | 'factor') => {
    if (value === undefined || value === null) return <Skeleton className="h-5 w-16 inline-block" />;
    switch (type) {
        case 'currency':
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        case 'percentage':
            return `${value.toFixed(1)}%`;
        case 'factor':
            return value.toFixed(2); // For profit factor, etc.
        case 'number':
        default:
            return value.toLocaleString();
    }
};

export function BacktestResultDialog({ isOpen, onOpenChange, strategy }: BacktestResultDialogProps) {
  const { toast } = useToast();
  const [backtestData, setBacktestData] = useState<BacktestResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  useEffect(() => {
    async function loadBacktestData() {
      if (!isOpen || !strategy) {
        setBacktestData(null); // Clear data when dialog closes or no strategy
        setAiSummary(null);
        setError(null);
        setIsLoading(true);
        return;
      }

      setIsLoading(true);
      setError(null);
      setAiSummary(null); // Clear previous summary

      try {
        console.log(`Fetching backtest results for strategy: ${strategy.id} (${strategy.name})`);
        const results = await getBacktestResults(strategy.id); // Fetch results using the service
        setBacktestData(results);
        console.log("Backtest results fetched:", results);
      } catch (err) {
        console.error("Failed to fetch backtest results:", err);
        setError(`Failed to load backtest results for "${strategy.name}". ${err instanceof Error ? err.message : 'Please try again.'}`);
        toast({
          title: "Error Loading Backtest Data",
          description: error,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadBacktestData();
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, strategy, toast]); // Rerun when dialog opens or strategy changes

   const handleGenerateSummary = async () => {
      if (!backtestData || !strategy) return;

      setIsLoadingSummary(true);
      setAiSummary(null); // Clear previous summary
      setError(null); // Clear previous errors specifically for summary generation

      try {
          console.log("Generating AI summary for backtest results...");
          const summaryResult = await summarizeBacktestResults({
              profitFactor: backtestData.summaryMetrics.profitFactor,
              drawdown: backtestData.summaryMetrics.maxDrawdown * 100, // Convert to percentage for flow
              winRate: backtestData.summaryMetrics.winRate * 100, // Convert to percentage
              totalTrades: backtestData.summaryMetrics.totalTrades,
              netProfit: backtestData.summaryMetrics.netProfit,
              strategyDescription: strategy.description, // Pass strategy description for context
          });
          setAiSummary(summaryResult.summary);
          console.log("AI summary generated:", summaryResult.summary);
          toast({
             title: "AI Summary Generated",
             description: "Successfully generated a summary of the backtest results.",
          });
      } catch (err) {
          console.error("Failed to generate AI summary:", err);
          const summaryError = `Failed to generate AI summary. ${err instanceof Error ? err.message : 'Please try again.'}`;
          setError(summaryError); // Show error in the dialog
          toast({
              title: "AI Summary Error",
              description: summaryError,
              variant: "destructive",
          });
      } finally {
          setIsLoadingSummary(false);
      }
   };

   const renderContent = () => {
     if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center h-64 space-y-4">
                 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                 <p className="text-muted-foreground">Loading backtest results...</p>
                 {/* Skeletons for metrics */}
                 <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full max-w-md mt-4">
                     <span className="text-muted-foreground">Net Profit:</span><Skeleton className="h-5 w-20 justify-self-end" />
                     <span className="text-muted-foreground">Profit Factor:</span><Skeleton className="h-5 w-16 justify-self-end" />
                     <span className="text-muted-foreground">Max Drawdown:</span><Skeleton className="h-5 w-16 justify-self-end" />
                     <span className="text-muted-foreground">Win Rate:</span><Skeleton className="h-5 w-16 justify-self-end" />
                     <span className="text-muted-foreground">Total Trades:</span><Skeleton className="h-5 w-12 justify-self-end" />
                 </div>
             </div>
         );
     }

      if (error && !backtestData) { // Show primary error if data loading failed completely
         return (
             <div className="flex flex-col items-center justify-center h-64 text-destructive space-y-4">
                 <AlertTriangle className="h-8 w-8" />
                 <p className="text-center">{error}</p>
                 <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
             </div>
         );
     }

     if (!backtestData) { // Should not happen if not loading and no error, but handle defensively
         return (
             <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                 <p>No backtest data available for this strategy.</p>
             </div>
         );
     }

     // Data is available, render results
     const metrics = backtestData.summaryMetrics;
     return (
         <div className="space-y-6">
             {/* Performance Chart */}
             <Card>
                 <CardHeader>
                     <CardTitle>Equity Curve</CardTitle>
                     <CardDescription>Portfolio value over the backtest period.</CardDescription>
                 </CardHeader>
                 <CardContent className="pl-2">
                     {backtestData.equityCurve.length > 0 ? (
                        <PerformanceChart data={backtestData.equityCurve} />
                     ) : (
                        <p className="text-center text-muted-foreground py-4">No equity data available for chart.</p>
                     )}
                 </CardContent>
             </Card>

             {/* Summary Metrics */}
             <Card>
                  <CardHeader>
                     <CardTitle>Summary Metrics</CardTitle>
                 </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                     <div>
                         <dt className="text-muted-foreground">Net Profit</dt>
                         <dd className={cn("font-semibold", metrics.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                             {formatValue(metrics.netProfit, 'currency')}
                         </dd>
                     </div>
                     <div>
                         <dt className="text-muted-foreground">Profit Factor</dt>
                         <dd className="font-semibold">{formatValue(metrics.profitFactor, 'factor')}</dd>
                     </div>
                     <div>
                         <dt className="text-muted-foreground">Max Drawdown</dt>
                         <dd className="font-semibold">{formatValue(metrics.maxDrawdown * 100, 'percentage')}</dd> {/* Display as % */}
                     </div>
                     <div>
                         <dt className="text-muted-foreground">Win Rate</dt>
                         <dd className="font-semibold">{formatValue(metrics.winRate * 100, 'percentage')}</dd> {/* Display as % */}
                     </div>
                     <div>
                         <dt className="text-muted-foreground">Total Trades</dt>
                         <dd className="font-semibold">{formatValue(metrics.totalTrades, 'number')}</dd>
                     </div>
                      <div>
                         <dt className="text-muted-foreground">Avg Trade P&L</dt>
                         <dd className={cn("font-semibold", metrics.avgTradePnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                             {formatValue(metrics.avgTradePnl, 'currency')}
                         </dd>
                     </div>
                      {/* Add more metrics if available in BacktestResults */}
                 </CardContent>
             </Card>

             {/* AI Summary Section */}
             <Card>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <div>
                        <CardTitle>AI Summary</CardTitle>
                        <CardDescription>Let AI provide an interpretation of the results.</CardDescription>
                     </div>
                      <Button
                          size="sm"
                          onClick={handleGenerateSummary}
                          disabled={isLoadingSummary}
                        >
                          {isLoadingSummary ? (
                              <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
                              </>
                          ) : (
                             <>
                                  <MessageSquareText className="mr-2 h-4 w-4" /> Generate Summary
                             </>
                          )}
                      </Button>
                 </CardHeader>
                 <CardContent>
                      {isLoadingSummary && <Skeleton className="h-16 w-full" />}
                      {/* Display error specific to summary generation */}
                     {error && !isLoadingSummary && (
                          <p className="text-sm text-destructive">{error}</p>
                      )}
                     {!isLoadingSummary && aiSummary && (
                         <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSummary}</p>
                     )}
                      {!isLoadingSummary && !aiSummary && !error && (
                         <p className="text-sm text-muted-foreground">Click "Generate Summary" for an AI interpretation.</p>
                      )}
                 </CardContent>
             </Card>

             {/* Optionally add Trade Log section if desired */}
             {/* <Card> ... </Card> */}
         </div>
     );
   }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"> {/* Allow larger dialog & scrolling */}
        <DialogHeader>
          <DialogTitle>Backtest Results: {strategy?.name || 'Strategy'}</DialogTitle>
          <DialogDescription>
             Review the historical performance simulation for this strategy.
             {strategy?.fileName && <span className="block text-xs text-muted-foreground mt-1">File: {strategy.fileName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderContent()}
        </div>

        <DialogFooter>
           {/* Maybe add actions like "Optimize Parameters" later */}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
