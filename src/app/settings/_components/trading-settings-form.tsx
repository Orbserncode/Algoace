// src/app/settings/_components/trading-settings-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BrainCircuit, Eye, Upload, Download, Archive, Trash2, Loader2 } from "lucide-react"; // Added icons
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getAiConfigRecommendations, getStoredConfigs, deleteStoredConfig } from '@/services/settings-service'; // Mock service
import type { AiConfigRecommendation, StoredTradingConfig } from '@/services/settings-service'; // Types


// Define Zod schema for allowed trades/assets
const allowedTradeSchema = z.object({
    tradeType: z.array(z.enum(["buy", "sell"])).min(1, "Select at least one trade type"),
    tradeMethod: z.array(z.enum(["spot", "futures", "options"])).min(1, "Select at least one method"),
    assetType: z.array(z.enum(["forex", "stock", "crypto", "etf", "commodity"])).min(1, "Select at least one asset type"),
    assetCategory: z.array(z.string()).optional().describe("Comma-separated list of allowed categories (e.g., Tech, Healthcare)"),
});

// Main form schema
const formSchema = z.object({
  riskManagementMode: z.enum(["manual", "ai"]).default("manual").describe("How risk parameters are managed"),
  defaultRiskPerTrade: z.coerce.number().min(0).max(10, {message: "Risk must be between 0 and 10%"}).optional().describe("Default percentage of capital to risk per trade (manual mode)"),
  maxPortfolioDrawdown: z.coerce.number().min(1).max(50, {message: "Max drawdown must be between 1 and 50%"}).optional().describe("Maximum allowed portfolio drawdown percentage (manual mode)"),
  leverageManagementMode: z.enum(["manual", "ai"]).default("manual").describe("How leverage is managed"),
  defaultLeverage: z.coerce.number().min(1).max(100).optional().describe("Default leverage to use if applicable (manual mode)"),
  allowedTrades: allowedTradeSchema.default({ // Set default allowed trades
      tradeType: ["buy", "sell"],
      tradeMethod: ["spot"],
      assetType: ["stock", "etf"],
      assetCategory: [],
  }),
});

type FormData = z.infer<typeof formSchema>;
type AllowedTradeKey = keyof z.infer<typeof allowedTradeSchema>;

export function TradingSettingsForm() {
    const [aiRecommendations, setAiRecommendations] = useState<AiConfigRecommendation[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [storedConfigs, setStoredConfigs] = useState<StoredTradingConfig[]>([]);
    const [isLoadingStored, setIsLoadingStored] = useState(false);
    const [viewingConfig, setViewingConfig] = useState<StoredTradingConfig | null>(null); // For modal/dialog

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        // TODO: Fetch actual trading settings from backend
        defaultValues: {
            riskManagementMode: "manual",
            defaultRiskPerTrade: 1,
            maxPortfolioDrawdown: 20,
            leverageManagementMode: "manual",
            defaultLeverage: 1,
            allowedTrades: {
                tradeType: ["buy", "sell"],
                tradeMethod: ["spot"],
                assetType: ["stock", "etf", "crypto"],
                assetCategory: ["Tech", "Finance"], // Example defaults
            },
        },
    });

     const { watch, control } = form;
     const riskMode = watch("riskManagementMode");
     const leverageMode = watch("leverageManagementMode");

    // Fetch AI recommendations and stored configs on mount
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingRecs(true);
            setIsLoadingStored(true);
            try {
                const [recs, stored] = await Promise.all([
                    getAiConfigRecommendations(),
                    getStoredConfigs(),
                ]);
                setAiRecommendations(recs);
                setStoredConfigs(stored);
            } catch (error) {
                toast({ title: "Error Loading Data", description: "Could not load AI recommendations or stored configs.", variant: "destructive" });
            } finally {
                setIsLoadingRecs(false);
                setIsLoadingStored(false);
            }
        };
        loadInitialData();
    }, []);

    function onSubmit(values: FormData) {
        console.log("Trading settings submitted:", values);
        // TODO: Implement saving trading settings to backend config/database
        toast({
            title: "Settings Saved",
            description: "Your global trading settings have been updated.",
        });
    }

     const handleLoadConfig = (config: StoredTradingConfig) => {
        // TODO: Implement loading config logic - this might override form values
        // Example: form.reset(config.parameters); // Assuming parameters match form structure
        toast({ title: "Load Config", description: `Simulating loading config: ${config.name}` });
        console.log("Load config:", config.id);
        // Potentially close a modal if viewingConfig was set
        setViewingConfig(null);
    }

     const handleArchiveConfig = async (configId: string) => {
         // TODO: Implement archiving logic via settings-service
         toast({ title: "Archive Config", description: `Simulating archiving config ID: ${configId}` });
         console.log("Archive config:", configId);
         // Update local state on success
         // setStoredConfigs(prev => prev.map(c => c.id === configId ? {...c, isArchived: true} : c));
     }

     const handleDeleteConfig = async (configId: string) => {
        // TODO: Implement deletion logic via settings-service
        try {
             await deleteStoredConfig(configId); // Call mock service
             toast({ title: "Config Deleted", description: `Configuration ${configId} deleted.` });
             setStoredConfigs(prev => prev.filter(c => c.id !== configId));
              if (viewingConfig?.id === configId) {
                setViewingConfig(null); // Close modal if viewing deleted config
              }
        } catch (error) {
             toast({ title: "Error Deleting Config", description: error instanceof Error ? error.message : "Failed to delete.", variant: "destructive"});
        }
    }

     // Helper for rendering checkbox groups
     const renderCheckboxGroup = (field: AllowedTradeKey, options: string[]) => {
        const fieldName = `allowedTrades.${field}`;
        return (
             <FormField
                control={control}
                name={fieldName as any} // Need to cast for nested array field
                render={() => (
                    <FormItem className="space-y-3">
                        <FormLabel className="text-base capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {options.map((item) => (
                                <FormField
                                    key={item}
                                    control={control}
                                    name={fieldName as any}
                                    render={({ field: checkboxField }) => {
                                    return (
                                        <FormItem
                                            key={item}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                            <FormControl>
                                                <Checkbox
                                                    checked={checkboxField.value?.includes(item)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? checkboxField.onChange([...(checkboxField.value || []), item])
                                                        : checkboxField.onChange(
                                                            checkboxField.value?.filter(
                                                                (value: string) => value !== item
                                                            )
                                                            )
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-sm font-normal capitalize">
                                                {item}
                                            </FormLabel>
                                        </FormItem>
                                    )
                                    }}
                                />
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    }

  return (
    <>
      {/* AI Recommendation Alert */}
      {isLoadingRecs && (
           <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <AlertTitle>Loading AI Recommendations...</AlertTitle>
           </Alert>
      )}
      {!isLoadingRecs && aiRecommendations.length > 0 && (
          <Alert className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <BrainCircuit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle>AI Configuration Recommendations Available!</AlertTitle>
            <AlertDescription>
              AI agents have generated new trading configurations based on recent analysis.
              <Button variant="link" size="sm" className="p-0 h-auto ml-2 text-blue-600 dark:text-blue-400" onClick={() => document.getElementById('ai-configs')?.scrollIntoView({ behavior: 'smooth' })}>
                View Recommendations
              </Button>
            </AlertDescription>
          </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

           {/* Risk Management Section */}
           <Card>
                <CardHeader>
                    <CardTitle>Risk Management</CardTitle>
                    <CardDescription>Configure how trading risk is managed across strategies.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <FormField
                        control={control}
                        name="riskManagementMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risk Parameter Mode</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select management mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manual">Manual Configuration</SelectItem>
                                <SelectItem value="ai">AI Managed (Uses Recommendations)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Choose 'AI Managed' to let agents dynamically adjust risk based on recommendations.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {riskMode === 'manual' && (
                          <>
                              <FormField
                                control={control}
                                name="defaultRiskPerTrade"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Default Risk Per Trade (%)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="e.g., 1" {...field} value={field.value ?? ''} step="0.1" min="0" max="10" />
                                    </FormControl>
                                    <FormDescription>Percentage of capital to risk on a single trade (manual mode).</FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={control}
                                name="maxPortfolioDrawdown"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Portfolio Drawdown (%)</FormLabel>
                                    <FormControl>
                                      <Input type="number" placeholder="e.g., 20" {...field} value={field.value ?? ''} min="1" max="50" />
                                    </FormControl>
                                    <FormDescription>Maximum acceptable loss from the portfolio peak (manual mode).</FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                         </>
                      )}
                       {riskMode === 'ai' && (
                           <Alert variant="default" className="bg-muted/50">
                              <BrainCircuit className="h-4 w-4"/>
                              <AlertTitle>AI Managed Risk</AlertTitle>
                              <AlertDescription>
                                  Risk parameters (risk per trade, drawdown) will be dynamically adjusted based on active AI recommendations. View and manage recommendations below.
                              </AlertDescription>
                          </Alert>
                       )}
                </CardContent>
            </Card>

             {/* Leverage Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Leverage</CardTitle>
                    <CardDescription>Configure default leverage settings.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <FormField
                        control={control}
                        name="leverageManagementMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Leverage Mode</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select leverage mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="manual">Manual Configuration</SelectItem>
                                <SelectItem value="ai">AI Managed (Uses Recommendations)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>Choose how leverage is determined (if supported by broker and strategy).</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {leverageMode === 'manual' && (
                           <FormField
                              control={control}
                              name="defaultLeverage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Default Leverage (Manual)</FormLabel>
                                  <FormControl>
                                    <Input type="number" placeholder="e.g., 10" {...field} value={field.value ?? ''} min="1" step="1" />
                                  </FormControl>
                                  <FormDescription>Default leverage for strategies (if supported/applicable).</FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                      )}
                      {leverageMode === 'ai' && (
                           <Alert variant="default" className="bg-muted/50">
                              <BrainCircuit className="h-4 w-4"/>
                              <AlertTitle>AI Managed Leverage</AlertTitle>
                              <AlertDescription>
                                  Leverage will be dynamically adjusted based on active AI recommendations and risk assessment.
                              </AlertDescription>
                          </Alert>
                       )}
                 </CardContent>
            </Card>

             {/* Allowed Trades Section */}
             <Card>
                <CardHeader>
                    <CardTitle>Allowed Trades & Assets</CardTitle>
                    <CardDescription>Define the scope of trading activities permitted by the system.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                      {renderCheckboxGroup("tradeType", ["buy", "sell"])}
                      {renderCheckboxGroup("tradeMethod", ["spot", "futures", "options"])}
                      {renderCheckboxGroup("assetType", ["forex", "stock", "crypto", "etf", "commodity"])}
                      <FormField
                          control={control}
                          name="allowedTrades.assetCategory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allowed Asset Categories (Optional)</FormLabel>
                              <FormControl>
                                  {/* We'll use a simple Input for comma-separated values for now */}
                                 <Input
                                     placeholder="e.g., Tech, Finance, Energy"
                                     value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                                     onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                 />
                              </FormControl>
                              <FormDescription>Comma-separated list of allowed sectors or categories (e.g., Tech, Healthcare). Leave blank for all.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                 </CardContent>
            </Card>


          <Button type="submit">Save Trading Settings</Button>
        </form>
      </Form>

      {/* AI Config Recommendations Section */}
       <Card id="ai-configs" className="mt-8">
         <CardHeader>
            <CardTitle>AI Configuration Recommendations</CardTitle>
            <CardDescription>Review configurations generated by AI agents based on market conditions and analysis.</CardDescription>
         </CardHeader>
         <CardContent>
             {isLoadingRecs ? (
                 <div className="flex items-center justify-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                 </div>
             ) : aiRecommendations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No AI recommendations available currently.</p>
             ) : (
                 <ScrollArea className="h-[250px] w-full">
                     <div className="space-y-3 pr-4">
                        {aiRecommendations.map((rec) => (
                            <div key={rec.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex-1 space-y-0.5 mr-4 overflow-hidden">
                                     <p className="text-sm font-medium truncate">{rec.name}</p>
                                     <p className="text-xs text-muted-foreground truncate">Generated: {new Date(rec.generatedAt).toLocaleDateString()}</p>
                                     <p className="text-xs text-muted-foreground truncate">Reason: {rec.reason}</p>
                                </div>
                                 <Button variant="outline" size="sm" onClick={() => {/* TODO: Implement view/accept logic */ toast({title: "View/Accept Recommendation", description: "Implement functionality"})}}>
                                     <Eye className="mr-1 h-3 w-3"/> View/Accept
                                 </Button>
                            </div>
                        ))}
                     </div>
                 </ScrollArea>
             )}
         </CardContent>
      </Card>

      {/* Stored/Historical Configurations */}
       <Card className="mt-8">
           <CardHeader>
               <CardTitle>Stored Trading Configurations</CardTitle>
               <CardDescription>Manage previously used or saved configuration files.</CardDescription>
           </CardHeader>
           <CardContent>
               {isLoadingStored ? (
                  <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                   </div>
               ) : storedConfigs.filter(c => !c.isArchived).length === 0 ? ( // Filter out archived here for display count
                  <p className="text-muted-foreground text-center py-4">No active stored configurations found.</p>
               ) : (
                   <ScrollArea className="h-[300px] w-full">
                       <div className="space-y-3 pr-4">
                          {storedConfigs.filter(c => !c.isArchived).map((config) => ( // Filter here for display
                              <div key={config.id} className="flex items-center justify-between rounded-lg border p-3">
                                  <div className="flex-1 space-y-0.5 mr-2 overflow-hidden">
                                      <p className="text-sm font-medium truncate">{config.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">Saved: {new Date(config.savedAt).toLocaleDateString()}</p>
                                      {config.associatedStrategyId && (
                                          <p className="text-xs text-muted-foreground truncate">Used with: {config.associatedStrategyId}</p>
                                      )}
                                      {typeof config.performance === 'number' && (
                                           <p className={cn("text-xs font-semibold", config.performance >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                Performance: {config.performance.toFixed(2)}%
                                            </p>
                                      )}
                                  </div>
                                   <div className="flex items-center space-x-1">
                                       <Button variant="outline" size="sm" title="View Details" onClick={() => setViewingConfig(config)}>
                                           <Eye className="h-4 w-4" />
                                       </Button>
                                      <Button variant="outline" size="sm" title="Load Config" onClick={() => handleLoadConfig(config)}>
                                          <Download className="h-4 w-4" /> {/* Changed icon */}
                                      </Button>
                                       <Button variant="outline" size="sm" title="Archive Config" onClick={() => handleArchiveConfig(config.id)}>
                                           <Archive className="h-4 w-4" />
                                       </Button>
                                   </div>
                              </div>
                          ))}
                       </div>
                   </ScrollArea>
               )}
               {/* TODO: Add button/toggle to view archived configurations */}
           </CardContent>
       </Card>

       {/* Dialog/Modal for Viewing Stored Config Details (Basic Example) */}
       {viewingConfig && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Card className="w-full max-w-lg">
                 <CardHeader>
                    <CardTitle>Config Details: {viewingConfig.name}</CardTitle>
                     <CardDescription>Saved on {new Date(viewingConfig.savedAt).toLocaleString()}</CardDescription>
                 </CardHeader>
                 <CardContent className="max-h-[60vh] overflow-y-auto">
                    <pre className="text-xs bg-muted p-4 rounded-md whitespace-pre-wrap">
                        {JSON.stringify(viewingConfig.parameters, null, 2)}
                    </pre>
                     {/* Display associated strategy and performance */}
                 </CardContent>
                 <CardFooter className="flex justify-between">
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteConfig(viewingConfig.id)}>
                           <Trash2 className="mr-1 h-4 w-4"/> Delete Permanently
                      </Button>
                    <div>
                        <Button variant="ghost" onClick={() => setViewingConfig(null)}>Close</Button>
                        <Button className="ml-2" onClick={() => handleLoadConfig(viewingConfig)}>Load Config</Button>
                    </div>
                 </CardFooter>
              </Card>
           </div>
       )}

    </>
  );
}
