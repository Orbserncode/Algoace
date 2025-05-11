// src/app/backtesting/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2, AlertTriangle, MessageSquareText, Download, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getStrategies, Strategy } from '@/services/strategies-service';
import { getAvailableAssets } from '@/services/broker-service'; // Mock service for assets
import {
    runBacktest,
    getBacktestResults,
    BacktestResults,
    getBacktestJobStatus,
    checkDatasetAvailability,
    saveBacktestResults
} from '@/services/backtesting-service';
import { summarizeBacktestResults } from '@/ai/flows/summarize-backtest-results';
import { PerformanceChart } from '@/app/monitoring/_components/performance-chart'; // Reuse chart
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedVisualizations } from './_components/advanced-visualizations'; // Import advanced charts
import BacktestHistoryTab from './_components/backtest-history-tab'; // Import backtest history tab

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

// Type guard to check if a state is one of the specified states
const isState = (state: BacktestState, ...validStates: BacktestState[]): boolean => {
    return validStates.includes(state);
};

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

// Prepare data for visualizations
const prepareChartData = (equityCurve: BacktestResults['equityCurve']) => {
    // Convert equity curve data to the format expected by AdvancedVisualizations
    return equityCurve.map(point => ({
        date: point.date,
        open: point.portfolioValue,
        high: point.portfolioValue,
        low: point.portfolioValue,
        close: point.portfolioValue
    }));
}


export default function BacktestingPage() {
    // State for active tab
    const [activeTab, setActiveTab] = useState<string>("run");
    const { toast } = useToast();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [assets, setAssets] = useState<string[]>([]);
    const [backtestState, setBacktestState] = useState<BacktestState>(BacktestState.IDLE);
    const [backtestResults, setBacktestResults] = useState<BacktestResults | null>(null);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [jobId, setJobId] = useState<string | null>(null); // To track the running job
    const [isInitialDataLoading, setIsInitialDataLoading] = useState(true); // Track initial load
    const [isBrokerConnected, setIsBrokerConnected] = useState(false); // Track if broker is connected
    const [isTickDataAvailable, setIsTickDataAvailable] = useState(true); // Track if tick data is available
    const [showDownloadDialog, setShowDownloadDialog] = useState(false); // Control download dialog visibility
    const [isDownloading, setIsDownloading] = useState(false); // Track download state
    const [isSaving, setIsSaving] = useState(false); // Track saving state

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

    // Fetch strategies and check broker connection on mount
    useEffect(() => {
        async function loadInitialData() {
            setIsInitialDataLoading(true); // Start loading
            try {
                // Fetch only non-archived strategies for the dropdown
                const fetchedStrategies = await getStrategies(false);
                setStrategies(fetchedStrategies);
                
                // Check if broker is connected by trying to get configured brokers
                const { getConfiguredBrokers } = await import('@/services/settings-service');
                const brokers = await getConfiguredBrokers();
                const brokerConnected = brokers && brokers.length > 0;
                setIsBrokerConnected(brokerConnected);
                
                // Only fetch assets if broker is connected
                if (brokerConnected) {
                    const fetchedAssets = await getAvailableAssets();
                    setAssets(fetchedAssets);
                }
            } catch (err) {
                console.error("Failed to load initial data:", err);
                setError("Failed to load strategies or broker connection. Please refresh.");
                toast({ title: "Error", description: "Could not load initial data.", variant: "destructive" });
            } finally {
                setIsInitialDataLoading(false); // Finish loading
            }
        }
        loadInitialData();
    }, [toast]);

     // State for progress tracking
     const [progress, setProgress] = useState<number>(0);
     const [currentDate, setCurrentDate] = useState<string | null>(null);
     const [totalDays, setTotalDays] = useState<number>(0);
     
     // Polling for job status with progress information
     useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (backtestState === BacktestState.RUNNING && jobId) {
            intervalId = setInterval(async () => {
                try {
                    const statusInfo = await getBacktestJobStatus(jobId);
                    console.log(`Backtest job ${jobId} status: ${statusInfo.status}, progress: ${statusInfo.progress}%`);
                    
                    // Update progress information
                    if (statusInfo.progress !== undefined) {
                        setProgress(statusInfo.progress);
                    }
                    if (statusInfo.current_date) {
                        setCurrentDate(statusInfo.current_date);
                    }
                    if (statusInfo.total_days) {
                        setTotalDays(statusInfo.total_days);
                    }
                    
                    if (statusInfo.status === 'COMPLETED') {
                        setBacktestState(BacktestState.FETCHING);
                        clearInterval(intervalId!);
                        // Use strategy ID from form state when fetching results after completion
                        const currentStrategyId = form.getValues("strategyId");
                        if (currentStrategyId) {
                            fetchResults(currentStrategyId);
                        } else {
                             console.error("Strategy ID missing when trying to fetch results.");
                             setError("Could not fetch results: Strategy ID missing.");
                             setBacktestState(BacktestState.ERROR);
                        }
                    } else if (statusInfo.status === 'FAILED') {
                        setBacktestState(BacktestState.ERROR);
                        setError(statusInfo.message || `Backtest job ${jobId} failed.`);
                        toast({
                            title: "Backtest Failed",
                            description: statusInfo.message || `The backtest process encountered an error (Job ID: ${jobId}).`,
                            variant: "destructive"
                        });
                        clearInterval(intervalId!);
                         // Fetch results even on failure, as they might contain error logs
                         const currentStrategyId = form.getValues("strategyId");
                         if (currentStrategyId) {
                             fetchResults(currentStrategyId, true); // Pass flag indicating expected failure
                         }
                    }
                    // Keep polling if 'PENDING' or 'RUNNING'
                } catch (err) {
                    console.error("Error checking job status:", err);
                    setError("Failed to check backtest status.");
                    setBacktestState(BacktestState.ERROR);
                    clearInterval(intervalId!);
                }
            }, 2000); // Poll every 2 seconds for more responsive progress updates
        }

        // Cleanup interval on component unmount or state change
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [backtestState, jobId, toast]); // Add form dependency


    const fetchResults = async (strategyId: string, expectFailure: boolean = false) => {
         try {
             console.log(`Fetching backtest results for strategy: ${strategyId}`);
             const results = await getBacktestResults(strategyId);
             setBacktestResults(results);
             console.log("Backtest results fetched:", results);
             setBacktestState(BacktestState.COMPLETE); // Set state to complete after fetching
             // Adjust toast message based on expected outcome
              if (!expectFailure) {
                  toast({ title: "Backtest Complete", description: "Results loaded successfully. You can save these results to history."});
              } else {
                  toast({ title: "Backtest Failed", description: "Loaded results/logs from failed backtest.", variant: "destructive" });
              }
         } catch (err) {
             console.error("Failed to fetch backtest results:", err);
             const errorMsg = `Failed to load backtest results. ${err instanceof Error ? err.message : 'Please try again.'}`;
             setError(errorMsg);
             setBacktestState(BacktestState.ERROR);
             toast({ title: "Error Loading Results", description: errorMsg, variant: "destructive" });
         }
    }
    
    // Check if tick data is available when asset and timeframe are selected
    const selectedAsset = form.watch('asset');
    const selectedTimeframe = form.watch('timeframe');
    
    // State for dataset information
    const [datasetInfo, setDatasetInfo] = useState<{
        available: boolean;
        count: number;
        start_date?: string;
        end_date?: string;
        has_date_range: boolean;
    }>({ available: false, count: 0, has_date_range: false });

    useEffect(() => {
        async function checkTickDataAvailability() {
            if (!selectedAsset || !selectedTimeframe) {
                setIsTickDataAvailable(true); // Default to true when nothing selected
                setDatasetInfo({ available: false, count: 0, has_date_range: false });
                return;
            }
            
            try {
                console.log(`Checking if tick data is available for ${selectedAsset} (${selectedTimeframe})...`);
                const availability = await checkDatasetAvailability(selectedAsset, selectedTimeframe);
                setIsTickDataAvailable(availability.available);
                setDatasetInfo(availability);
                console.log(`Tick data for ${selectedAsset} (${selectedTimeframe}) is ${availability.available ? 'available' : 'not available'}`);
                
                // Show a toast notification with dataset information
                if (availability.available) {
                    const dataPoints = availability.data_points || 0;
                    toast({
                        title: "Dataset Available",
                        description: `Found ${dataPoints} data points for ${selectedAsset} (${selectedTimeframe})${availability.has_date_range ? ` from ${availability.start_date} to ${availability.end_date}` : ''}`,
                        variant: "default"
                    });
                } else {
                    toast({
                        title: "Dataset Not Available",
                        description: `No data found for ${selectedAsset} (${selectedTimeframe}). Please download the data first.`,
                        variant: "destructive"
                    });
                }
                
                // If dataset has date range, update form date values if they're outside the range
                if (availability.has_date_range && availability.start_date && availability.end_date) {
                    const datasetStartDate = new Date(availability.start_date);
                    const datasetEndDate = new Date(availability.end_date);
                    
                    const currentStartDate = form.getValues('startDate');
                    const currentEndDate = form.getValues('endDate');
                    
                    let dateAdjusted = false;
                    
                    // Adjust start date if it's before dataset start date
                    if (currentStartDate && currentStartDate < datasetStartDate) {
                        form.setValue('startDate', datasetStartDate);
                        dateAdjusted = true;
                    }
                    
                    // Adjust end date if it's after dataset end date
                    if (currentEndDate && currentEndDate > datasetEndDate) {
                        form.setValue('endDate', datasetEndDate);
                        dateAdjusted = true;
                    }
                    
                    if (dateAdjusted) {
                        toast({
                            title: "Date Range Adjusted",
                            description: `Date range adjusted to match available data (${format(datasetStartDate, "PPP")} to ${format(datasetEndDate, "PPP")})`,
                            variant: "default"
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to check tick data availability:", err);
                setIsTickDataAvailable(false); // Assume not available on error
                setDatasetInfo({ available: false, count: 0, has_date_range: false });
            }
        }
        
        checkTickDataAvailability();
    }, [selectedAsset, selectedTimeframe, form, toast]);
    // Handle tick data download
    const handleDownloadTickData = async () => {
        if (!selectedAsset || !selectedTimeframe) return;
        
        const startDate = form.getValues('startDate');
        const endDate = form.getValues('endDate');
        
        if (!startDate || !endDate) {
            toast({
                title: "Missing Date Range",
                description: "Please select start and end dates for the download.",
                variant: "destructive"
            });
            return;
        }
        
        // Check if we need to download additional data
        if (datasetInfo.has_date_range && datasetInfo.start_date && datasetInfo.end_date) {
            const datasetStartDate = new Date(datasetInfo.start_date);
            const datasetEndDate = new Date(datasetInfo.end_date);
            
            // If requested dates are within available range, no need to download
            if (startDate >= datasetStartDate && endDate <= datasetEndDate) {
                toast({
                    title: "Data Already Available",
                    description: `The requested date range is already available in the database.`,
                    variant: "default"
                });
                
                // Set tick data as available and proceed
                setIsTickDataAvailable(true);
                return;
            }
            
            // Show a more specific message about what data needs to be downloaded
            const needEarlierData = startDate < datasetStartDate;
            const needLaterData = endDate > datasetEndDate;
            
            let message = "Need to download ";
            if (needEarlierData && needLaterData) {
                message += `data before ${format(datasetStartDate, "PPP")} and after ${format(datasetEndDate, "PPP")}`;
            } else if (needEarlierData) {
                message += `data before ${format(datasetStartDate, "PPP")}`;
            } else if (needLaterData) {
                message += `data after ${format(datasetEndDate, "PPP")}`;
            }
            
            toast({
                title: "Downloading Additional Data",
                description: message,
                variant: "default"
            });
        }
        
        
        setIsDownloading(true);
        
        try {
            const { downloadTickData } = await import('@/services/broker-service');
            const success = await downloadTickData(
                selectedAsset,
                selectedTimeframe,
                format(startDate, "yyyy-MM-dd"),
                format(endDate, "yyyy-MM-dd")
            );
            
            if (success) {
                toast({
                    title: "Download Complete",
                    description: `Successfully downloaded ${selectedAsset} ${selectedTimeframe} data.`
                });
                setIsTickDataAvailable(true);
                setShowDownloadDialog(false);
            } else {
                toast({
                    title: "Download Failed",
                    description: "Could not download the requested data. Please try again.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error("Failed to download tick data:", err);
            toast({
                title: "Download Error",
                description: `Error downloading data: ${err instanceof Error ? err.message : 'Unknown error'}`,
                variant: "destructive"
            });
        } finally {
            setIsDownloading(false);
        }
    };

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

        // Find strategy in the unfiltered list (might be archived)
        const strategy = strategies.find(s => s.id === backtestResults.strategyId);
        if (!strategy) {
             toast({ title: "Strategy Not Found", description: "Could not find details for the strategy used in this backtest.", variant: "destructive" });
             return;
         };


        setBacktestState(BacktestState.SUMMARIZING);
        setAiSummary(null);
        setError(null); // Clear previous errors specifically for the summary section

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
            setError(summaryError); // Show error in the results section, specifically for summary
            setBacktestState(BacktestState.COMPLETE); // Still show results, but with error message in summary section
            toast({ title: "AI Summary Error", description: summaryError, variant: "destructive" });
        }
   };
   
   // Function to save backtest results to history
   const handleSaveResults = async () => {
       if (!backtestResults) {
           toast({
               title: "No Results to Save",
               description: "Please run a backtest first.",
               variant: "destructive"
           });
           return;
       }
       
       setIsSaving(true);
       
       try {
           await saveBacktestResults(backtestResults.strategyId, backtestResults);
           
           toast({
               title: "Results Saved",
               description: "Backtest results have been saved to history."
           });
           
           // Switch to history tab after saving
           setActiveTab("history");
       } catch (err) {
           console.error("Failed to save backtest results:", err);
           toast({
               title: "Save Failed",
               description: `Could not save results: ${err instanceof Error ? err.message : 'Unknown error'}`,
               variant: "destructive"
           });
       } finally {
           setIsSaving(false);
       }
   };

    const isLoading = backtestState === BacktestState.QUEUING || backtestState === BacktestState.RUNNING || backtestState === BacktestState.FETCHING || isInitialDataLoading;
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
                                        {isInitialDataLoading && <SelectItem value="loading" disabled>Loading strategies...</SelectItem>}
                                        {!isInitialDataLoading && strategies.length === 0 && <SelectItem value="no-strategies" disabled>No active strategies available.</SelectItem>}
                                        {/* Filter out Archived strategies from the dropdown */}
                                        {!isInitialDataLoading && strategies.filter(s => s.status !== 'Archived').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || !isBrokerConnected}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={isBrokerConnected ? "Select asset..." : "No broker connected"} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                         {isInitialDataLoading && <SelectItem value="loading-assets" disabled>Loading assets...</SelectItem>}
                                         {!isInitialDataLoading && !isBrokerConnected && <SelectItem value="no-broker" disabled>Connect a broker in settings first</SelectItem>}
                                         {!isInitialDataLoading && isBrokerConnected && assets.length === 0 && <SelectItem value="no-assets" disabled>No assets available.</SelectItem>}
                                         {!isInitialDataLoading && isBrokerConnected && assets.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormDescription>
                                    {isBrokerConnected
                                        ? "Asset provided by your broker config."
                                        : "Connect a broker in settings to see available assets."}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    {/* Display date range information if available */}
                    {datasetInfo.has_date_range && datasetInfo.start_date && datasetInfo.end_date && (
                        <div className="col-span-2 bg-muted p-3 rounded-md text-sm">
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <CalendarIcon className="h-4 w-4" />
                                <span>Available data range: {format(new Date(datasetInfo.start_date), "PPP")} to {format(new Date(datasetInfo.end_date), "PPP")}</span>
                            </div>
                        </div>
                    )}
                    
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <div className="flex space-x-2">
                                    <Input
                                        type="date"
                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : null;
                                            if (date) field.onChange(date);
                                        }}
                                        disabled={isLoading}
                                        className="w-full"
                                    />
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" disabled={isLoading}>
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
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
                                </div>
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
                                <div className="flex space-x-2">
                                    <Input
                                        type="date"
                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : null;
                                            if (date) field.onChange(date);
                                        }}
                                        disabled={isLoading}
                                        className="w-full"
                                    />
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="icon" disabled={isLoading}>
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
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
                                </div>
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
                 <div className="flex flex-col md:flex-row gap-4">
                     {/* Disable button during queuing, running, fetching */}
                     <Button
                         type="submit"
                         disabled={
                             (backtestState !== BacktestState.IDLE &&
                             backtestState !== BacktestState.COMPLETE &&
                             backtestState !== BacktestState.ERROR) ||
                             !isTickDataAvailable
                         }
                         className="w-full md:w-auto"
                     >
                         {backtestState === BacktestState.QUEUING ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Queuing Backtest...
                             </>
                         ) : backtestState === BacktestState.RUNNING ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Running Job {jobId?.substring(0, 8)}... {progress > 0 ? `${progress}%` : ''}
                             </>
                         ) : backtestState === BacktestState.FETCHING ? (
                             <>
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                 Fetching Results...
                             </>
                         ) : (
                             "Run Backtest"
                         )}
                     </Button>
                     
                     {/* Download Data button - only show when data is not available and asset/timeframe are selected */}
                     {selectedAsset && selectedTimeframe && !isTickDataAvailable && (
                         <Button
                             type="button"
                             variant="outline"
                             onClick={() => setShowDownloadDialog(true)}
                             className="w-full md:w-auto"
                         >
                             Download Required Data
                         </Button>
                     )}
                 </div>
                 {/* Display progress bar when running */}
                 {backtestState === BacktestState.RUNNING && (
                    <div className="mt-2">
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300 ease-in-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Processing: {currentDate || 'Starting...'}</span>
                            <span>{progress}% complete</span>
                        </div>
                    </div>
                 )}
                 
                 {/* Data availability notification */}
                 {selectedAsset && selectedTimeframe && (
                     <div className={`mt-4 p-4 rounded-md border ${isTickDataAvailable ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                         <div className="flex items-start">
                             <div className={`mr-3 ${isTickDataAvailable ? 'text-green-500 dark:text-green-400' : 'text-amber-500 dark:text-amber-400'}`}>
                                 {isTickDataAvailable ? (
                                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                         <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                         <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                     </svg>
                                 ) : (
                                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                         <circle cx="12" cy="12" r="10"></circle>
                                         <line x1="12" y1="8" x2="12" y2="12"></line>
                                         <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                     </svg>
                                 )}
                             </div>
                             <div className="flex-1">
                                 <h3 className={`text-sm font-medium ${isTickDataAvailable ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                     {isTickDataAvailable ? 'Data Available' : 'Data Not Available'}
                                 </h3>
                                 <div className={`mt-1 text-sm ${isTickDataAvailable ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                                     {isTickDataAvailable ? (
                                         <>
                                             <p>
                                                 {datasetInfo.data_points} data points available for {selectedAsset} ({selectedTimeframe})
                                                 {datasetInfo.has_date_range && datasetInfo.start_date && datasetInfo.end_date && (
                                                     <> from {datasetInfo.start_date} to {datasetInfo.end_date}</>
                                                 )}
                                             </p>
                                             {form.getValues('startDate') && form.getValues('endDate') && datasetInfo.has_date_range && (
                                                 <p className="mt-1">
                                                     <strong>Selected range:</strong> {format(form.getValues('startDate'), "yyyy-MM-dd")} to {format(form.getValues('endDate'), "yyyy-MM-dd")}
                                                 </p>
                                             )}
                                         </>
                                     ) : (
                                         <>
                                             <p>No data available for {selectedAsset} ({selectedTimeframe})</p>
                                             {form.getValues('startDate') && form.getValues('endDate') && (
                                                 <p className="mt-1">
                                                     <strong>Required range:</strong> {format(form.getValues('startDate'), "yyyy-MM-dd")} to {format(form.getValues('endDate'), "yyyy-MM-dd")}
                                                 </p>
                                             )}
                                         </>
                                     )}
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
                
                 {/* Display general error if form submission or polling fails */}
                 {backtestState === BacktestState.ERROR && error && !backtestResults && (
                    <div className="text-destructive text-sm mt-2 flex items-center">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        {error}
                    </div>
                 )}
            </form>
        </Form>
    );
    
    // Render download dialog
    const renderDownloadDialog = () => (
        <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Download Market Data</DialogTitle>
                    <DialogDescription>
                        {isBrokerConnected ? (
                            <>
                                Historical data for {selectedAsset} ({selectedTimeframe}) is not available.
                                Download it using the date range from your backtest configuration.
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="h-4 w-4 text-amber-500 inline-block mr-1" />
                                <span className="text-amber-500 font-medium">No broker or data source configured.</span>
                                <p className="mt-2">
                                    Please configure a broker or data source in the Settings page before downloading data.
                                    You can also configure alternative data sources like Yahoo Finance.
                                </p>
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>
                
                {isBrokerConnected ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FormLabel>Start Date</FormLabel>
                                <Input
                                    type="text"
                                    value={form.getValues('startDate') ? format(form.getValues('startDate'), "PPP") : ''}
                                    disabled
                                />
                            </div>
                            <div>
                                <FormLabel>End Date</FormLabel>
                                <Input
                                    type="text"
                                    value={form.getValues('endDate') ? format(form.getValues('endDate'), "PPP") : ''}
                                    disabled
                                />
                            </div>
                        </div>
                        <div>
                            <FormLabel>Asset</FormLabel>
                            <Input type="text" value={selectedAsset} disabled />
                        </div>
                        <div>
                            <FormLabel>Timeframe</FormLabel>
                            <Input type="text" value={selectedTimeframe} disabled />
                        </div>
                    </div>
                ) : (
                    <div className="py-4">
                        <Button variant="secondary" onClick={() => window.location.href = '/settings'}>
                            Go to Settings
                        </Button>
                    </div>
                )}
                
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDownloadDialog(false)} disabled={isDownloading}>
                        Cancel
                    </Button>
                    {isBrokerConnected && (
                        <Button onClick={handleDownloadTickData} disabled={isDownloading}>
                            {isDownloading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Data
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

        // Show global error message if state is ERROR and results haven't loaded
         if (backtestState === BacktestState.ERROR && error && !backtestResults) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-destructive space-y-4">
                    <AlertTriangle className="h-8 w-8" />
                    <p className="text-center">{error}</p>
                    <Button variant="outline" onClick={() => { setError(null); setBacktestState(BacktestState.IDLE); }}>Dismiss</Button>
                </div>
            );
        }

        // Show results if state is COMPLETE (or ERROR *after* results loaded) and results exist
         if ((backtestState === BacktestState.COMPLETE || backtestState === BacktestState.ERROR) && backtestResults) {
            const metrics = backtestResults.summaryMetrics;
            // Prepare chart data
            const chartData = prepareChartData(backtestResults.equityCurve);

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
                         {/* Display log output if available (e.g., on failure) */}
                          <CardFooter className="flex flex-col space-y-4">
                              {backtestResults.logOutput && (
                                  <details className="w-full">
                                       <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">View Backtest Log</summary>
                                       <ScrollArea className="mt-2 h-32 w-full rounded-md border bg-muted/50 p-2">
                                           <pre className="text-xs whitespace-pre-wrap break-words">
                                               <code>{backtestResults.logOutput}</code>
                                           </pre>
                                       </ScrollArea>
                                  </details>
                              )}
                          </CardFooter>
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
                                  disabled={isState(backtestState, BacktestState.SUMMARIZING)}
                                >
                                  {isState(backtestState, BacktestState.SUMMARIZING) ? (
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
                             {error && isState(backtestState, BacktestState.COMPLETE) && ( // Only show summary error here if results are loaded but summary failed
                                  <p className="text-sm text-destructive flex items-center">
                                      <AlertTriangle className="mr-1 h-4 w-4" /> {error}
                                  </p>
                              )}
                             {!error && aiSummary && ( // Show summary if no error for summary and it exists
                                 <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSummary}</p>
                             )}
                             {!error && !aiSummary && !isState(backtestState, BacktestState.SUMMARIZING) && ( // Prompt to generate if no error and no summary
                                 <p className="text-sm text-muted-foreground">Click "Generate Summary" for an AI interpretation.</p>
                              )}
                              {isState(backtestState, BacktestState.SUMMARIZING) && ( // Show loading state while summarizing
                                 <div className="flex items-center text-muted-foreground">
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      <span>Generating AI summary...</span>
                                  </div>
                              )}
                         </CardContent>
                     </Card>

                     {/* Advanced Visualizations */}
                    <AdvancedVisualizations
                        trades={backtestResults.trades || []}
                        isLoading={isState(backtestState, BacktestState.FETCHING)}
                        equityCurve={chartData} // Pass prepared data
                     />

                     {/* Save Button at the bottom of results */}
                     <div className="mt-6">
                         <Button
                             onClick={handleSaveResults}
                             disabled={isSaving}
                             className="w-full"
                         >
                             {isSaving ? (
                                 <>
                                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                     Saving Results...
                                 </>
                             ) : (
                                 <>
                                     <Save className="mr-2 h-4 w-4" />
                                     Save Results
                                 </>
                             )}
                         </Button>
                     </div>

                  </div>
            );
         }

         // Default: Show prompt or initial state message
         return (
            <div className="text-center text-muted-foreground py-10">
                {isInitialDataLoading
                    ? 'Loading initial data...'
                    : 'Select a strategy and parameters, then click "Run Backtest".'
                }
            </div>
        );
    };


    return (
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="run">Run Backtest</TabsTrigger>
                <TabsTrigger value="history">Backtest History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="run" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Run Backtest</CardTitle>
                    <CardDescription>
                        Select a strategy, asset, and timeframe to simulate its performance over historical data.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isInitialDataLoading ? (
                         <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading configuration...</span>
                         </div>
                     ) : error && strategies.length === 0 && assets.length === 0 ? ( // Show error only if initial data failed to load completely
                        <div className="flex flex-col items-center justify-center py-10 text-destructive">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p>{error}</p>
                            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button>
                        </div>
                     ) : (
                        renderForm() // Render the form once data is loaded or if there's no critical error
                    )}
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
                         {backtestState === BacktestState.ERROR && error && `An error occurred: ${error}`}
                         {backtestState === BacktestState.ERROR && !error && 'An unknown error occurred during the backtest process.'}
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
            {/* Add ScrollArea style if needed */}
            <style jsx global>{`
             .scroll-area-with-scrollbar {
                /* Add specific styles if needed, e.g., max-height */
              }
             `}</style>
            </TabsContent>
            
            <TabsContent value="history">
                <BacktestHistoryTab />
            </TabsContent>
        </Tabs>
    );
}
