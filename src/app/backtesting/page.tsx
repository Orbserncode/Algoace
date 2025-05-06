// src/app/backtesting/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, MessageSquareText } from "lucide-react";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getStrategies, Strategy } from '@/services/strategies-service';
import { getAvailableAssets } from '@/services/broker-service'; // Mock service for assets
import { runBacktest, getBacktestResults, BacktestResults, getBacktestJobStatus } from '@/services/backtesting-service';
import { summarizeBacktestResults } from '@/ai/flows/summarize-backtest-results';
import { PerformanceChart } from '@/app/monitoring/_components/performance-chart'; // Reuse chart
import { Skeleton } from "@/components/ui/skeleton";

// Validation Schema
const backtestFormSchema = z.object({
    strategyId: z.string().min(1, { message: "Please select a strategy." }),
    asset: z.string().min(1, { message: "Please select an asset." }),
    startDate: z.date({ required_error: "Start date is required." }),
    endDate: z.date({ required_error: "End date is required." }),
    initialCapital: z.coerce.number().min(100, { message: "Initial capital must be at least $100." }).default(10000),
    timeframe: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1d"),
}).refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date.",
    path: ["endDate"], // Field to attach error to
});

type BacktestFormData = z.infer<typeof backtestFormSchema>;

enum BacktestState {
    IDLE = 'idle',
    QUEUING = 'queuing', // Waiting for backend to start the job
    RUNNING = 'running', // Backend is processing the backtest
    FETCHING = 'fetching', // Fetching results after completion
    SUMMARIZING = 'summarizing', // AI summary generation
    COMPLETE = 'complete',
    ERROR = 'error',
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

export default function BacktestingPage() {
    const { toast } = useToast();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [assets, setAssets] = useState<string[]>([]);
    const [backtestState, setBacktestState] = useState<BacktestState>(BacktestState.IDLE);
    const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null); // To track the running job

    const form = useForm<BacktestFormData>({
        resolver: zodResolver(backtestFormSchema),
        defaultValues: {
            strategyId: "",
            asset: "",
            initialCapital: 10000,
            timeframe: "1d",
            // Default dates can be tricky, might leave blank or set relative defaults
            // startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Default 1 year ago
            // endDate: new Date(), // Default today
        },
    });

    // Fetch strategies and assets on mount
    useEffect(() => {
        async function loadInitialData() {
            try {
                const [fetchedStrategies, fetchedAssets] = await Promise.all([
                    getStrategies(),
                    getAvailableAssets() // Fetch from mock broker service
                ]);
                setStrategies(fetchedStrategies);
                setAssets(fetchedAssets);
            } catch (err) {
                console.error("Failed to load initial data:", err);
                setError("Failed to load strategies or assets. Please refresh.");
                toast({ title: "Error", description: "Could not load initial data.", variant: "destructive" });
            }
        }
        loadInitialData();
    }, [toast]);

     // Polling for job status (simple example)
     useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (backtestState === BacktestState.RUNNING && jobId) {
            intervalId = setInterval(async () => {
                try {
                    const status = await getBacktestJobStatus(jobId);
                    console.log(`Backtest job ${jobId} status: ${status}`);
                    if (status === 'COMPLETED') {
                        setBacktestState(BacktestState.FETCHING);
                        clearInterval(intervalId!);
                        fetchResults(form.getValues("strategyId")); // Fetch results after completion
                    } else if (status === 'FAILED') {
                        setBacktestState(BacktestState.ERROR);
                        setError(`Backtest job ${jobId} failed.`);
                        toast({ title: "Backtest Failed", description: "The backtest process encountered an error.", variant: "destructive"});
                        clearInterval(intervalId!);
                    }
                    // Keep polling if 'PENDING' or 'RUNNING'
                } catch (err) {
                    console.error("Error checking job status:", err);
                    setError("Failed to check backtest status.");
                    setBacktestState(BacktestState.ERROR);
                    clearInterval(intervalId!);
                }
            }, 5000); // Poll every 5 seconds
        }

        // Cleanup interval on component unmount or state change
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backtestState, jobId, toast]); // Add form dependency if needed


    const fetchResults = async (strategyId: string) => {
         try {
             console.log(`Fetching backtest results for strategy: ${strategyId}`);
             const results = await getBacktestResults(strategyId);
             setBacktestResults(results);
             console.log("Backtest results fetched:", results);
             setBacktestState(BacktestState.COMPLETE); // Set state to complete after fetching
             toast({ title: "Backtest Complete", description: "Results loaded successfully."});
         } catch (err) {
             console.error("Failed to fetch backtest results:", err);
             setError(`Failed to load backtest results. ${err instanceof Error ? err.message : 'Please try again.'}`);
             setBacktestState(BacktestState.ERROR);
             toast({ title: "Error Loading Results", description: error, variant: "destructive" });
         }
    }

    async function onSubmit(values: BacktestFormData) {
        setBacktestState(BacktestState.QUEUING);
        setError(null);
        setBacktestResults(null); // Clear previous results
        setAiSummary(null);
        setJobId(null);

        console.log("Running backtest with values:", values);

        try {
             // Include parameters expected by the backend/service
             const backtestParams = {
                 startDate: format(values.startDate, "yyyy-MM-dd"),
                 endDate: format(values.endDate, "yyyy-MM-dd"),
                 initialCapital: values.initialCapital,
                 symbol: values.asset,
                 timeframe: values.timeframe,
             };

            const { jobId: newJobId } = await runBacktest(values.strategyId, backtestParams);
            setJobId(newJobId);
            setBacktestState(BacktestState.RUNNING); // Move to running state after successful queueing
            toast({ title: "Backtest Started", description: `Job ${newJobId} is running. Results will appear when complete.`});

            // Polling will handle fetching results once complete
            // For simpler implementation without polling, could fetch directly after runBacktest if it waits:
            // setBacktestState(BacktestState.FETCHING);
            // await fetchResults(values.strategyId);

        } catch (err) {
            console.error("Failed to start backtest:", err);
            const errorMsg = `Failed to start backtest. ${err instanceof Error ? err.message : 'Please try again.'}`;
            setError(errorMsg);
            setBacktestState(BacktestState.ERROR);
            toast({ title: "Error Starting Backtest", description: errorMsg, variant: "destructive" });
        }
    }

      const handleGenerateSummary = async () => {
        if (!backtestResults || !strategies.length) return;

        const strategy = strategies.find(s => s.id === backtestResults.strategyId);
        if (!strategy) return;

        setBacktestState(BacktestState.SUMMARIZING);
        setAiSummary(null);
        setError(null);

        try {
            console.log("Generating AI summary for backtest results...");
            const summaryResult = await summarizeBacktestResults({
                profitFactor: backtestResults.summaryMetrics.profitFactor,
                drawdown: backtestResults.summaryMetrics.maxDrawdown * 100,
                winRate: backtestResults.summaryMetrics.winRate * 100,
                totalTrades: backtestResults.summaryMetrics.totalTrades,
                netProfit: backtestResults.summaryMetrics.netProfit,
                strategyDescription: strategy.description,
            });
            setAiSummary(summaryResult.summary);
            console.log("AI summary generated:", summaryResult.summary);
            setBacktestState(BacktestState.COMPLETE); // Return to complete state
            toast({ title: "AI Summary Generated", description: "Successfully generated summary." });
        } catch (err) {
            console.error("Failed to generate AI summary:", err);
            const summaryError = `Failed to generate AI summary. ${err instanceof Error ? err.message : 'Please try again.'}`;
            setError(summaryError); // Show error in the results section
            setBacktestState(BacktestState.COMPLETE); // Still show results, but with error message
            toast({ title: "AI Summary Error", description: summaryError, variant: "destructive" });
        }
   };

    const isLoading = backtestState === BacktestState.QUEUING || backtestState === BacktestState.RUNNING || backtestState === BacktestState.FETCHING;
    const selectedStrategyName = strategies.find(s => s.id === form.watch('strategyId'))?.name || "Strategy";


    // Render Functions for Clarity
    const renderForm = () => (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="strategyId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Strategy</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select strategy..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {strategies.length === 0 && <SelectItem value="" disabled>Loading strategies...</SelectItem>}
                                        {strategies.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="asset"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Asset/Symbol</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select asset..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {assets.length === 0 && <SelectItem value="" disabled>Loading assets...</SelectItem>}
                                        {assets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                        {/* Add option for custom input? */}
                                    </SelectContent>
                                </Select>
                                <FormDescription>Asset provided by your broker config.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                                )}
                                                 disabled={isLoading}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick a start date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1990-01-01") || isLoading
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                     />
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>End Date</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                                )}
                                                 disabled={isLoading}
                                            >
                                                {field.value ? (
                                                    format(field.value, "PPP")
                                                ) : (
                                                    <span>Pick an end date</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) =>
                                                date > new Date() || date < new Date("1990-01-01") || isLoading
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                     />
                       <FormField
                        control={form.control}
                        name="initialCapital"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Initial Capital ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 10000" {...field} disabled={isLoading}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="timeframe"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Timeframe</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select timeframe..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {/* These values should align with Lumibot or your backtester */}
                                        <SelectItem value="1m">1 Minute</SelectItem>
                                        <SelectItem value="5m">5 Minutes</SelectItem>
                                        <SelectItem value="15m">15 Minutes</SelectItem>
                                        <SelectItem value="1h">1 Hour</SelectItem>
                                        <SelectItem value="4h">4 Hours</SelectItem>
                                        <SelectItem value="1d">1 Day</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {backtestState === BacktestState.QUEUING && 'Queuing...'}
                            {backtestState === BacktestState.RUNNING && `Running Job ${jobId?.substring(0, 8)}...`}
                            {backtestState === BacktestState.FETCHING && 'Fetching Results...'}
                        </>
                    ) : (
                        "Run Backtest"
                    )}
                </Button>
            </form>
        </Form>
    );

    const renderResults = () => {
         // Show loading indicator while fetching/summarizing even if results are partially available
         if (backtestState === BacktestState.FETCHING || backtestState === BacktestState.SUMMARIZING) {
            return (
                 <div className="flex flex-col items-center justify-center h-64 space-y-4">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     <p className="text-muted-foreground">
                        {backtestState === BacktestState.FETCHING ? 'Fetching results...' : 'Generating AI summary...'}
                     </p>
                 </div>
            );
         }

        // Show error message if state is ERROR
         if (backtestState === BacktestState.ERROR && error) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-destructive space-y-4">
                    <AlertTriangle className="h-8 w-8" />
                    <p className="text-center">{error}</p>
                    <Button variant="outline" onClick={() => { setError(null); setBacktestState(BacktestState.IDLE); }}>Dismiss</Button>
                </div>
            );
        }

        // Show results if state is COMPLETE and results exist
         if (backtestState === BacktestState.COMPLETE && backtestResults) {
            const metrics = backtestResults.summaryMetrics;
            return (
                 <div className="space-y-6 mt-6 animate-fade-in">
                     {/* Performance Chart */}
                     <Card>
                         <CardHeader>
                             <CardTitle>Equity Curve</CardTitle>
                             <CardDescription>Portfolio value over the backtest period.</CardDescription>
                         </CardHeader>
                         <CardContent className="pl-2">
                             {backtestResults.equityCurve.length > 0 ? (
                                 <PerformanceChart data={backtestResults.equityCurve} dataKeyY="portfolioValue" />
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
                                 <dd className="font-semibold">{formatValue(metrics.maxDrawdown * 100, 'percentage')}</dd>
                             </div>
                             <div>
                                 <dt className="text-muted-foreground">Win Rate</dt>
                                 <dd className="font-semibold">{formatValue(metrics.winRate * 100, 'percentage')}</dd>
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
                             {/* Optionally add start/end date, Sharpe ratio etc. */}
                             {metrics.startDate && <div><dt className="text-muted-foreground">Start Date</dt><dd>{metrics.startDate}</dd></div>}
                             {metrics.endDate && <div><dt className="text-muted-foreground">End Date</dt><dd>{metrics.endDate}</dd></div>}
                             {metrics.sharpeRatio && <div><dt className="text-muted-foreground">Sharpe Ratio</dt><dd>{metrics.sharpeRatio.toFixed(2)}</dd></div>}
                         </CardContent>
                     </Card>

                     {/* AI Summary Section */}
                     <Card>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <div>
                                <CardTitle>AI Summary</CardTitle>
                                <CardDescription>AI-powered interpretation of the results.</CardDescription>
                             </div>
                             <Button
                                  size="sm"
                                  onClick={handleGenerateSummary}
                                  disabled={backtestState === BacktestState.SUMMARIZING}
                                >
                                  {backtestState === BacktestState.SUMMARIZING ? (
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
                              {/* Show error specific to summary generation */}
                             {error && backtestState === BacktestState.COMPLETE && ( // Only show summary error here
                                  <p className="text-sm text-destructive">{error}</p>
                              )}
                             {!error && aiSummary && (
                                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSummary}</p>
                             )}
                             {!error && !aiSummary && (
                                 <p className="text-sm text-muted-foreground">Click "Generate Summary" for an AI interpretation.</p>
                              )}
                         </CardContent>
                     </Card>
                     {/* Optionally: Add Trade Log Table/Details */}
                 </div>
            );
         }

         // Default: Show prompt or initial state message
         return (
            <div className="text-center text-muted-foreground py-10">
                Select a strategy and parameters, then click "Run Backtest".
            </div>
        );
    };


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Run Backtest</CardTitle>
                    <CardDescription>
                        Select a strategy, asset, and timeframe to simulate its performance over historical data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderForm()}
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                     <CardTitle>Backtest Results: {backtestResults ? selectedStrategyName : 'Not Run'}</CardTitle>
                     <CardDescription>
                         {backtestState === BacktestState.IDLE && 'Results will appear here after running a backtest.'}
                         {backtestState === BacktestState.QUEUING && 'Waiting for backtest job to start...'}
                         {backtestState === BacktestState.RUNNING && `Backtest job ${jobId ? jobId.substring(0,8) + '...' : ''} is running. Polling for completion...`}
                         {backtestState === BacktestState.FETCHING && 'Fetching completed backtest results...'}
                          {backtestState === BacktestState.SUMMARIZING && 'Generating AI summary...'}
                         {backtestState === BacktestState.COMPLETE && backtestResults && `Showing results for ${selectedStrategyName} on ${backtestResults.summaryMetrics.symbol || 'asset'}.`}
                         {backtestState === BacktestState.ERROR && 'An error occurred during the backtest process.'}
                     </CardDescription>
                 </CardHeader>
                 <CardContent>
                     {renderResults()}
                 </CardContent>
            </Card>

            {/* Add animation utility if not already present */}
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
