'use client';

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertTriangle } from "lucide-react"; // Added AlertTriangle
import { toast } from "@/hooks/use-toast";
import { suggestStrategyConfig, generateAndTestStrategyFromSuggestion, Strategy } from '@/services/strategies-service'; // Import service functions
import { SuggestStrategyConfigInput, SuggestStrategyConfigOutput } from '@/ai/flows/suggest-strategy-config'; // Keep type import
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'; // Import Card components
import { Badge } from '@/components/ui/badge'; // Import Badge

const formSchema = z.object({
  marketConditions: z.string().min(3, { message: "Market conditions must be at least 3 characters." }).describe("Current market conditions (e.g., bullish, bearish, volatile)"),
  riskTolerance: z.enum(["low", "medium", "high"]).describe("User's risk tolerance level"),
  historicalDataInput: z.string().optional().describe("Paste historical performance data (JSON format) or leave blank to use default examples"), // Clarified description
  generationSchedule: z.enum(["manual", "daily", "weekly", "startup"]).default("manual"),
  autoDeploy: z.boolean().default(false),
  customPrompt: z.string().optional().describe("Optional: Add custom instructions for the AI"),
});

type FormData = z.infer<typeof formSchema>;

// Define default historical data used if input is blank
const defaultHistoricalData = JSON.stringify([
    { strategy: "Example Momentum", profitFactor: 1.8, drawdown: 15, winRate: 60 },
    { strategy: "Example Mean Reversion", profitFactor: 1.5, drawdown: 10, winRate: 55 },
    { strategy: "Example Trend Following", profitFactor: 2.1, drawdown: 20, winRate: 68 },
], null, 2); // Pretty-print for readability if someone inspects

interface AutomatedGenerationFormProps {
    onStrategyGenerated: (newStrategy: Strategy) => void; // Callback prop
}

// Enum for loading states
enum GenerationState {
    IDLE = 'idle',
    SUGGESTING = 'suggesting',
    GENERATING = 'generating', // Represents coding and backtesting phase
}


export function AutomatedGenerationForm({ onStrategyGenerated }: AutomatedGenerationFormProps) {
  const [generationState, setGenerationState] = useState<GenerationState>(GenerationState.IDLE);
  const [suggestedConfig, setSuggestedConfig] = useState<SuggestStrategyConfigOutput | null>(null); // Use the specific type
  const [generationError, setGenerationError] = useState<string | null>(null); // Store specific error message

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marketConditions: "",
      riskTolerance: "medium",
      historicalDataInput: "", // Keep empty by default
      generationSchedule: "manual",
      autoDeploy: false,
      customPrompt: "",
    },
  });

  const isProcessing = generationState !== GenerationState.IDLE;


  async function onSubmit(values: FormData) {
    setGenerationState(GenerationState.SUGGESTING);
    setSuggestedConfig(null); // Clear previous suggestions
    setGenerationError(null); // Clear previous errors

    console.log("Form submitted:", values);

    let historicalDataToUse = values.historicalDataInput || defaultHistoricalData;
    // Basic validation attempt for pasted JSON
    try {
        JSON.parse(historicalDataToUse);
    } catch (e) {
        toast({
            title: "Invalid Historical Data",
            description: "The provided historical data is not valid JSON. Using default example data instead.",
            variant: "destructive",
        });
        historicalDataToUse = defaultHistoricalData;
        form.setValue("historicalDataInput", ""); // Clear the invalid input
    }


    try {
      // 1. Get Suggestion from AI
      const suggestionInput: SuggestStrategyConfigInput = {
        marketConditions: values.marketConditions,
        riskTolerance: values.riskTolerance,
        historicalPerformanceData: historicalDataToUse,
        // customPrompt is not used by the flow currently
      };

      console.log("Calling suggestStrategyConfig with input:", suggestionInput);
      const suggestionResult = await suggestStrategyConfig(suggestionInput);
      console.log("Genkit suggestion result:", suggestionResult);
      setSuggestedConfig(suggestionResult); // Store the suggestion

      toast({
        title: "Strategy Suggestion Ready",
        description: `AI suggested '${suggestionResult.strategyName}'. Now attempting generation & backtesting...`,
      });

      // 2. Attempt Generation & Backtesting (using the service function)
      setGenerationState(GenerationState.GENERATING); // Update state
       // Pass autoDeploy preference if needed by the service function
      const newStrategy = await generateAndTestStrategyFromSuggestion(suggestionResult /*, values.autoDeploy */);

      if (newStrategy) {
         toast({
            title: "New Strategy Generated!",
            description: `Successfully generated and backtested '${newStrategy.name}'.`,
            variant: "default",
          });
          onStrategyGenerated(newStrategy); // Call the callback with the new strategy
          // Optionally reset parts of the form?
          // form.resetField("marketConditions");
          setSuggestedConfig(null); // Clear suggestion after success
      } else {
           const failureMsg = `The suggested strategy '${suggestionResult.strategyName}' did not pass backtesting or encountered an error during generation.`;
           setGenerationError(failureMsg);
           toast({
            title: "Strategy Generation Failed",
            description: failureMsg,
            variant: "destructive",
          });
      }

    } catch (error: any) { // Catch specific error type if possible
      console.error("Error during strategy generation process:", error);
      const errorMessage = error.message || "An unknown error occurred.";
       setGenerationError(`Failed to generate or suggest strategy: ${errorMessage}`);
      toast({
        title: "Generation Process Error",
        description: `Failed to generate or suggest strategy: ${errorMessage}`,
        variant: "destructive",
      });
       setSuggestedConfig(null); // Clear suggestion on error
    } finally {
      setGenerationState(GenerationState.IDLE); // Return to idle state
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="marketConditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Market Conditions</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Bullish, Volatile, Sideways" {...field} disabled={isProcessing}/>
                </FormControl>
                <FormDescription>Describe the current market environment.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="riskTolerance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Risk Tolerance</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Your comfort level with potential losses.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         <FormField
            control={form.control}
            name="historicalDataInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Historical Performance Data (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={`Paste JSON data here, e.g., ${JSON.stringify(JSON.parse(defaultHistoricalData)[0])} ... or leave blank to use default examples.`}
                    className="min-h-[100px] font-mono text-xs" // Use mono font for JSON
                    {...field}
                    disabled={isProcessing}
                  />
                </FormControl>
                <FormDescription>Provide past strategy results (JSON format) for better suggestions. If blank, example data will be used.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <FormField
            control={form.control}
            name="generationSchedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Generation Schedule</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isProcessing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manual">Manual Trigger</SelectItem>
                    <SelectItem value="startup" disabled>On Startup (Not Implemented)</SelectItem>
                    <SelectItem value="daily" disabled>Daily (Not Implemented)</SelectItem>
                    <SelectItem value="weekly" disabled>Weekly (Not Implemented)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>How often the agent should attempt generation (only manual trigger currently active).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="autoDeploy"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-8 md:mt-0">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Auto-Deploy Successful Strategies
                  </FormLabel>
                  <FormDescription>
                    Automatically activate generated strategies that pass backtesting. (Use with caution - Requires backend support).
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-readonly // Mark as potentially not fully functional yet
                    disabled={isProcessing}
                  />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
        </div>

         <FormField
            control={form.control}
            name="customPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Focus on high-frequency strategies, avoid crypto assets, prioritize low drawdown..."
                    {...field}
                    disabled // Mark as not currently used by the flow
                  />
                </FormControl>
                <FormDescription>Add specific guidance for the AI (Note: Custom instructions are not currently implemented in the AI flow).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


        <Button type="submit" disabled={isProcessing}>
          {generationState === GenerationState.SUGGESTING ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Suggestion...
            </>
          ) : generationState === GenerationState.GENERATING ? (
             <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating & Testing...
            </>
          ) : (
            "Suggest & Test Strategy" // Updated button text
          )}
        </Button>
      </form>
    </Form>

     {/* Display Suggested Configuration or Error */}
      {suggestedConfig && (
        <Card className="mt-6 border-dashed border-accent animate-fade-in">
          <CardHeader>
            <CardTitle>AI Strategy Suggestion</CardTitle>
            <CardDescription>Based on your input, the AI suggested the following configuration:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <h4 className="font-semibold">Strategy Name:</h4>
                <p className="text-muted-foreground">{suggestedConfig.strategyName}</p>
            </div>
             <div>
                <h4 className="font-semibold">Configuration Options (Example):</h4>
                <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono">
                    {JSON.stringify(suggestedConfig.configurationOptions, null, 2)}
                </pre>
            </div>
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <h4 className="font-semibold">Expected Return:</h4>
                    <p className="text-muted-foreground">{suggestedConfig.expectedReturn}%</p>
                 </div>
                 <div>
                    <h4 className="font-semibold">Suggested Risk Level:</h4>
                     <Badge variant={suggestedConfig.riskLevel === 'low' ? 'default' : suggestedConfig.riskLevel === 'medium' ? 'secondary' : 'destructive'}>
                         {suggestedConfig.riskLevel.charAt(0).toUpperCase() + suggestedConfig.riskLevel.slice(1)}
                     </Badge>
                 </div>
             </div>
             {generationState === GenerationState.GENERATING && ( // Show spinner only when processing this suggestion
                 <div className="flex items-center text-muted-foreground pt-2">
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     <span>Attempting to code, debug, and backtest this suggestion...</span>
                 </div>
             )}
              {/* Show error if generation failed *after* suggestion */}
             {generationState === GenerationState.IDLE && generationError && suggestedConfig && (
                  <div className="flex items-center text-destructive pt-2">
                     <AlertTriangle className="mr-2 h-4 w-4" />
                     <span>{generationError}</span>
                 </div>
             )}
             {/* Show generic message after completion if no specific error shown */}
             {generationState === GenerationState.IDLE && !generationError && suggestedConfig && (
                 <p className="text-xs text-muted-foreground pt-2">
                     Processing complete. Check notifications and the strategy list for results.
                 </p>
            )}
          </CardContent>
        </Card>
      )}
        {/* Show initial error if suggestion itself failed */}
        {generationState === GenerationState.IDLE && generationError && !suggestedConfig && (
            <div className="flex items-center text-destructive pt-4 mt-4 border-t">
                <AlertTriangle className="mr-2 h-5 w-5" />
                <span>{generationError}</span>
            </div>
        )}

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
      </>
  );
}
