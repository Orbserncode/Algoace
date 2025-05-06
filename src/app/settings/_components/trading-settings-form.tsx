// src/app/settings/_components/trading-settings-form.tsx
'use client';

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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Archive, Eye, Trash2, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
// Placeholder service/types - replace with actual implementations
import { saveTradingSettings, getAIConfigSuggestions, getSavedConfigs, deleteConfig, archiveConfig, type SavedConfig } from "@/services/settings-service";
import { useState, useEffect } from "react";

const managementOptions = ["user_defined", "ai_managed"] as const;

const formSchema = z.object({
  // Risk Management
  defaultRiskPerTrade: z.coerce.number().min(0).max(10, {message: "Risk must be between 0 and 10%"}).optional(),
  defaultRiskManagement: z.enum(managementOptions).default("user_defined"),
  maxPortfolioDrawdown: z.coerce.number().min(1).max(50, {message: "Max drawdown must be between 1 and 50%"}).optional(),
  maxPortfolioDrawdownManagement: z.enum(managementOptions).default("user_defined"),

  // Leverage
  defaultLeverage: z.coerce.number().min(1).max(100).optional(),
  leverageManagement: z.enum(managementOptions).default("user_defined"),

  // Order Management (Example)
  defaultTrailingStopPercent: z.coerce.number().min(0.1).max(20).optional(),
  trailingStopManagement: z.enum(managementOptions).default("user_defined"),

  // Allowed Trades
  allowedTradeTypes: z.array(z.enum(["buy", "sell"])).default(["buy", "sell"]),
  allowedTradingMethods: z.array(z.enum(["spot", "futures", "options"])).default(["spot"]),
  allowedAssetTypes: z.array(z.enum(["stock", "crypto", "forex", "etf"])).default(["stock", "etf"]),
  allowedCategories: z.string().optional().describe("Comma-separated list of allowed sectors/categories, e.g., Tech, Healthcare"),

  // Preferred Markets (from previous version)
  preferredMarkets: z.string().min(1, { message: "Specify at least one market." }).describe("Comma-separated list of preferred markets (e.g., NYSE, NASDAQ, Crypto)"),
});

type FormData = z.infer<typeof formSchema>;

export function TradingSettingsForm() {
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SavedConfig[]>([]); // Placeholder for AI suggestions
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]); // Placeholder for saved configs
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false); // Loading state for configs
  const [viewingConfig, setViewingConfig] = useState<SavedConfig | null>(null); // State for viewing a specific config

  // TODO: Fetch actual trading settings & configs on load
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      defaultRiskPerTrade: 1,
      defaultRiskManagement: "user_defined",
      maxPortfolioDrawdown: 20,
      maxPortfolioDrawdownManagement: "user_defined",
      preferredMarkets: "NYSE, NASDAQ",
      defaultLeverage: 1,
      leverageManagement: "user_defined",
      defaultTrailingStopPercent: undefined,
      trailingStopManagement: "user_defined",
      allowedTradeTypes: ["buy", "sell"],
      allowedTradingMethods: ["spot"],
      allowedAssetTypes: ["stock", "etf"],
      allowedCategories: "Tech, Healthcare, Finance",
    },
  });

  // Fetch AI suggestions and saved configs (example)
  useEffect(() => {
    const fetchConfigs = async () => {
        setIsLoadingConfigs(true);
        try {
            // Replace with actual service calls
            const [suggestions, saved] = await Promise.all([
                 getAIConfigSuggestions(),
                 getSavedConfigs(),
            ]);
            setAiSuggestions(suggestions);
            setSavedConfigs(saved);
        } catch (error) {
             toast({ title: "Error", description: "Could not load AI suggestions or saved configurations.", variant: "destructive" });
        } finally {
            setIsLoadingConfigs(false);
        }
    };
    fetchConfigs();
   }, []);


  async function onSubmit(values: FormData) {
    setIsSaving(true);
    console.log("Trading settings submitted:", values);
    try {
        // TODO: Implement saving trading settings via service
        await saveTradingSettings(values);
        toast({
            title: "Settings Saved",
            description: "Your global trading settings have been updated.",
        });
    } catch (error: any) {
         toast({
             title: "Error Saving Settings",
             description: `Could not save trading settings: ${error.message || 'Unknown error'}`,
             variant: "destructive",
         });
    } finally {
        setIsSaving(false);
    }
  }

   // --- AI Config Management Handlers (Placeholders) ---
   const handleViewConfig = (config: SavedConfig) => {
        setViewingConfig(config);
        // TODO: Open a modal or drawer to display the config details (YAML/JSON)
        console.log("Viewing config:", config.id, config.name);
        // For now, just log it
        toast({title: "View Config", description: `Displaying details for ${config.name} (implementation pending).`});
    };

   const handleAcceptConfig = (config: SavedConfig) => {
        // TODO: Implement logic to apply the AI config.
        // This might involve updating the form values or sending a specific request to the backend.
        console.log("Accepting config:", config.id);
        toast({ title: "Config Accepted", description: `Applying configuration ${config.name} (implementation pending).` });
        // Example: Update form state (needs careful mapping)
        // form.reset(mapConfigToFormData(config.configData));
        // Remove from suggestions list after accepting
        setAiSuggestions(prev => prev.filter(s => s.id !== config.id));
    };

    const handleDeleteConfigAction = async (configId: string) => {
        console.log("Deleting config:", configId);
        try {
            await deleteConfig(configId);
            setSavedConfigs(prev => prev.filter(c => c.id !== configId));
            toast({ title: "Config Deleted", description: "Configuration permanently deleted." });
        } catch (error:any) {
            toast({ title: "Error", description: `Failed to delete config: ${error.message}`, variant: "destructive" });
        }
    };

     const handleArchiveConfigAction = async (configId: string) => {
        console.log("Archiving config:", configId);
         try {
            await archiveConfig(configId);
             // Update local state to reflect archive status (or refetch)
             setSavedConfigs(prev => prev.map(c => c.id === configId ? { ...c, status: 'Archived' } : c));
            toast({ title: "Config Archived", description: "Configuration archived." });
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to archive config: ${error.message}`, variant: "destructive" });
        }
    };
    // --- End Placeholder Handlers ---


  // Helper function to render a setting with AI/User management toggle
  const renderManagedSetting = (
        name: keyof FormData,
        label: string,
        description: string,
        inputType: "number" | "text" = "number",
        inputProps: React.ComponentProps<typeof Input> = {}
    ) => {
      const managementFieldName = `${name}Management` as keyof FormData; // Assumes naming convention
      const isAiManaged = form.watch(managementFieldName) === 'ai_managed';

      return (
         <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-center justify-between">
                 <FormLabel>{label}</FormLabel>
                 <FormField
                    control={form.control}
                    name={managementFieldName}
                    render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                             <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                                <FormControl>
                                    <SelectTrigger className="h-8 w-[140px] text-xs">
                                        <SelectValue placeholder="Manage via..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="user_defined">User Defined</SelectItem>
                                    <SelectItem value="ai_managed">AI Managed</SelectItem>
                                </SelectContent>
                            </Select>
                             <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                 control={form.control}
                 name={name}
                 render={({ field }) => (
                     <FormItem>
                        <FormControl>
                            <Input
                                type={inputType}
                                placeholder={isAiManaged ? "AI Controlled" : `e.g., ${inputProps.placeholder || 'value'}`}
                                {...field}
                                value={isAiManaged ? "" : field.value ?? ""} // Clear value if AI managed
                                onChange={(e) => {
                                     if (!isAiManaged) {
                                         // Use coerce number for number inputs
                                         field.onChange(inputType === 'number' ? Number(e.target.value) || undefined : e.target.value);
                                     }
                                 }}
                                disabled={isSaving || isAiManaged}
                                {...inputProps}
                             />
                         </FormControl>
                         <FormDescription>{description}</FormDescription>
                         <FormMessage />
                     </FormItem>
                 )}
             />
         </div>
        );
  };

  return (
      <div className="space-y-8">
         {/* AI Configuration Suggestion Feed */}
        {aiSuggestions.length > 0 && (
             <Alert variant="default" className="border-accent">
                <Lightbulb className="h-4 w-4 !text-accent" />
                <AlertTitle>AI Configuration Suggestions Available!</AlertTitle>
                <AlertDescription>
                    The AI has generated new configuration suggestions based on recent analysis.
                     <ScrollArea className="mt-2 max-h-[150px] pr-4">
                         <ul className="space-y-2">
                            {aiSuggestions.map(suggestion => (
                                <li key={suggestion.id} className="text-xs flex justify-between items-center p-2 rounded bg-accent/10">
                                    <span>{suggestion.name} (Generated: {new Date(suggestion.createdAt).toLocaleDateString()})</span>
                                    <div className="space-x-1">
                                         <Button size="xs" variant="ghost" onClick={() => handleViewConfig(suggestion)}>View</Button>
                                         <Button size="xs" variant="outline" onClick={() => handleAcceptConfig(suggestion)}>Accept & Load</Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </AlertDescription>
            </Alert>
        )}


        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

             {/* Risk Management Section */}
             <Card>
                 <CardHeader>
                     <CardTitle>Risk Management</CardTitle>
                     <CardDescription>Define risk parameters for your trading activities.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    {renderManagedSetting(
                        "defaultRiskPerTrade",
                        "Default Risk Per Trade (%)",
                        "Percentage of capital to risk on a single trade by default.",
                        "number",
                        { step: "0.1", min: "0", max: "10", placeholder: "1.0" }
                     )}
                     {renderManagedSetting(
                        "maxPortfolioDrawdown",
                        "Max Portfolio Drawdown (%)",
                        "Maximum acceptable loss from the portfolio peak before intervention (e.g., pausing trading).",
                        "number",
                        { step: "0.5", min: "1", max: "50", placeholder: "20" }
                     )}
                 </CardContent>
             </Card>

              {/* Leverage Section */}
             <Card>
                 <CardHeader>
                     <CardTitle>Leverage</CardTitle>
                     <CardDescription>Configure default leverage settings (if supported by broker).</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                    {renderManagedSetting(
                        "defaultLeverage",
                        "Default Leverage",
                        "Default leverage multiplier to apply (e.g., 10 for 10x). Set to 1 for no leverage.",
                        "number",
                        { step: "1", min: "1", max: "100", placeholder: "1" }
                     )}
                 </CardContent>
             </Card>

             {/* Order Management Section */}
             <Card>
                 <CardHeader>
                     <CardTitle>Order Management</CardTitle>
                     <CardDescription>Define default parameters for order execution.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                     {renderManagedSetting(
                        "defaultTrailingStopPercent",
                        "Default Trailing Stop (%)",
                        "Optional: Set a default trailing stop loss percentage from the peak profit.",
                        "number",
                        { step: "0.1", min: "0.1", max: "20", placeholder: "2.0" }
                     )}
                     {/* Add more order settings like default order type, time-in-force etc. */}
                 </CardContent>
             </Card>


            {/* Allowed Trades Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Allowed Trades</CardTitle>
                     <CardDescription>Define the scope of assets and trade types permitted.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     {/* Trade Types */}
                     <FormField
                        control={form.control}
                        name="allowedTradeTypes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Allowed Trade Types</FormLabel>
                                <div className="flex space-x-4 pt-2">
                                    {(["buy", "sell"] as const).map((type) => (
                                        <FormField
                                            key={type}
                                            control={form.control}
                                            name="allowedTradeTypes"
                                            render={({ field: itemField }) => (
                                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                            checked={itemField.value?.includes(type)}
                                                            onCheckedChange={(checked) => {
                                                                return checked
                                                                ? itemField.onChange([...(itemField.value || []), type])
                                                                : itemField.onChange(
                                                                    itemField.value?.filter(
                                                                        (value) => value !== type
                                                                    )
                                                                )
                                                            }}
                                                            disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                    <FormLabel className="font-normal capitalize">{type}</FormLabel>
                                                </FormItem>
                                            )}
                                         />
                                    ))}
                                </div>
                                <FormMessage />
                             </FormItem>
                        )}
                    />
                     <Separator />
                     {/* Trading Methods */}
                     <FormField
                        control={form.control}
                        name="allowedTradingMethods"
                        render={() => (
                            <FormItem>
                                <FormLabel>Allowed Trading Methods</FormLabel>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                                    {(["spot", "futures", "options"] as const).map((method) => (
                                        <FormField
                                            key={method}
                                            control={form.control}
                                            name="allowedTradingMethods"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                             checked={field.value?.includes(method)}
                                                             onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), method])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== method
                                                                    )
                                                                )
                                                            }}
                                                             disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                     <FormLabel className="font-normal capitalize">{method}</FormLabel>
                                                </FormItem>
                                            )}
                                         />
                                    ))}
                                </div>
                                <FormMessage />
                             </FormItem>
                        )}
                    />
                     <Separator />
                    {/* Asset Types */}
                     <FormField
                        control={form.control}
                        name="allowedAssetTypes"
                        render={() => (
                            <FormItem>
                                <FormLabel>Allowed Asset Types</FormLabel>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                                     {(["stock", "crypto", "forex", "etf"] as const).map((asset) => (
                                        <FormField
                                            key={asset}
                                            control={form.control}
                                            name="allowedAssetTypes"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                                    <FormControl>
                                                        <Checkbox
                                                             checked={field.value?.includes(asset)}
                                                             onCheckedChange={(checked) => {
                                                                return checked
                                                                ? field.onChange([...(field.value || []), asset])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                        (value) => value !== asset
                                                                    )
                                                                )
                                                            }}
                                                             disabled={isSaving}
                                                        />
                                                    </FormControl>
                                                     <FormLabel className="font-normal capitalize">{asset}</FormLabel>
                                                </FormItem>
                                            )}
                                         />
                                    ))}
                                </div>
                                <FormMessage />
                             </FormItem>
                        )}
                    />
                    <Separator />
                     {/* Categories & Markets */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField
                            control={form.control}
                            name="allowedCategories"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Allowed Categories/Sectors (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Tech, Healthcare, Energy" {...field} disabled={isSaving} />
                                </FormControl>
                                <FormDescription>Comma-separated list of allowed market categories.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="preferredMarkets"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Preferred Exchanges/Markets</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., NYSE, NASDAQ, Binance, Kraken" {...field} disabled={isSaving} />
                                </FormControl>
                                <FormDescription>Comma-separated list of markets to primarily focus on.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                     </div>

                </CardContent>
            </Card>


            <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Trading Settings
            </Button>
        </form>
        </Form>

         {/* Saved Configurations Section */}
        <Card className="mt-8">
            <CardHeader>
                 <CardTitle>Saved Configurations</CardTitle>
                 <CardDescription>Manage previously saved or AI-generated configurations.</CardDescription>
            </CardHeader>
            <CardContent>
                 {isLoadingConfigs && (
                    <div className="flex items-center justify-center h-20">
                         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                         <span className="ml-2 text-muted-foreground">Loading configurations...</span>
                    </div>
                 )}
                 {!isLoadingConfigs && savedConfigs.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center">No saved configurations found.</p>
                 )}
                 {!isLoadingConfigs && savedConfigs.length > 0 && (
                     <ScrollArea className="max-h-[300px] pr-4">
                         <ul className="space-y-2">
                             {savedConfigs.map(config => (
                                <li key={config.id} className="text-sm flex justify-between items-center p-3 rounded border hover:bg-muted/50">
                                     <div>
                                        <span className="font-medium">{config.name}</span>
                                         <span className="text-xs text-muted-foreground ml-2">(Saved: {new Date(config.createdAt).toLocaleDateString()})</span>
                                         {config.status === 'Archived' && <Badge variant="outline" className="ml-2">Archived</Badge>}
                                         <p className="text-xs text-muted-foreground mt-1">Associated Strategy: {config.strategyName || 'N/A'}</p>
                                         {/* Optional: Display brief performance hint */}
                                     </div>
                                     <div className="space-x-1">
                                         <Button size="xs" variant="ghost" onClick={() => handleViewConfig(config)}><Eye className="h-3 w-3 mr-1"/>View</Button>
                                         {config.status !== 'Archived' && (
                                             <Button size="xs" variant="outline" onClick={() => handleAcceptConfig(config)}>Load</Button>
                                         )}
                                         {config.status !== 'Archived' ? (
                                             <Button size="xs" variant="ghost" onClick={() => handleArchiveConfigAction(config.id)}><Archive className="h-3 w-3"/></Button>
                                          ) : (
                                             <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteConfigAction(config.id)}><Trash2 className="h-3 w-3"/></Button>
                                          )}
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     </ScrollArea>
                 )}
            </CardContent>
        </Card>

      </div>
  );
}


// Helper component for Checkbox groups (copied from shadcn docs example) - requires Checkbox import
interface CheckboxReactHookFormMultipleProps {
  items: readonly { id: string; label: string }[];
  form: ReturnType<typeof useForm>; // Pass the form object
  name: string; // Name of the field in the form schema
}

// This is likely not needed if using the inline FormField approach above, but kept for reference
// export function CheckboxReactHookFormMultiple({ items, form, name }: CheckboxReactHookFormMultipleProps) {
//   return (
//     <FormField
//       control={form.control}
//       name={name}
//       render={() => (
//         <FormItem>
//           {/* ... Label if needed ... */}
//           {items.map((item) => (
//             <FormField
//               key={item.id}
//               control={form.control}
//               name={name}
//               render={({ field }) => {
//                 return (
//                   <FormItem
//                     key={item.id}
//                     className="flex flex-row items-start space-x-3 space-y-0"
//                   >
//                     <FormControl>
//                       <Checkbox
//                         checked={field.value?.includes(item.id)}
//                         onCheckedChange={(checked) => {
//                           return checked
//                             ? field.onChange([...field.value, item.id])
//                             : field.onChange(
//                                 field.value?.filter(
//                                   (value) => value !== item.id
//                                 )
//                               )
//                         }}
//                       />
//                     </FormControl>
//                     <FormLabel className="font-normal">
//                       {item.label}
//                     </FormLabel>
//                   </FormItem>
//                 )
//               }}
//             />
//           ))}
//           <FormMessage />
//         </FormItem>
//       )}
//     />
//   )
// }

// Ensure components used are exported if needed elsewhere
export { Checkbox }; // Assuming Checkbox is correctly imported from ui
