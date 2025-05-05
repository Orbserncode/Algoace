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
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { suggestStrategyConfig } from '@/ai/flows/suggest-strategy-config'; // Import the Genkit flow

const formSchema = z.object({
  marketConditions: z.string().min(1, { message: "Market conditions are required." }).describe("Current market conditions (e.g., bullish, bearish, volatile)"),
  riskTolerance: z.enum(["low", "medium", "high"]).describe("User's risk tolerance level"),
  historicalDataInput: z.string().optional().describe("Paste historical performance data (JSON format) or leave blank"),
  generationSchedule: z.enum(["manual", "daily", "weekly", "startup"]).default("manual"),
  autoDeploy: z.boolean().default(false),
  customPrompt: z.string().optional().describe("Optional: Add custom instructions for the AI"),
});

type FormData = z.infer<typeof formSchema>;

export function AutomatedGenerationForm() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedConfig, setSuggestedConfig] = useState<any>(null); // State to hold suggested config


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marketConditions: "",
      riskTolerance: "medium",
      historicalDataInput: "",
      generationSchedule: "manual",
      autoDeploy: false,
      customPrompt: "",
    },
  });

 // Mock historical data - replace with actual fetching/input method
 const mockHistoricalData = JSON.stringify([
    { strategy: "Momentum", profitFactor: 1.8, drawdown: 15, winRate: 60 },
    { strategy: "Mean Reversion", profitFactor: 1.5, drawdown: 10, winRate: 55 },
    { strategy: "Trend Following", profitFactor: 2.1, drawdown: 20, winRate: 68 },
  ]);


  async function onSubmit(values: FormData) {
    setIsGenerating(true);
    setSuggestedConfig(null); // Clear previous suggestions

    console.log("Form submitted:", values);

    try {
      // Prepare input for the Genkit flow
      const input = {
        marketConditions: values.marketConditions,
        riskTolerance: values.riskTolerance,
        // Use pasted data if available, otherwise use mock data
        historicalPerformanceData: values.historicalDataInput || mockHistoricalData,
        // Note: customPrompt and schedule are handled by the UI/backend logic, not directly by this specific Genkit flow
      };

      console.log("Calling suggestStrategyConfig with input:", input);
      const result = await suggestStrategyConfig(input);
      console.log("Genkit flow result:", result);

      setSuggestedConfig(result); // Store the suggestion

      toast({
        title: "Strategy Suggestion Ready",
        description: `AI suggested the '${result.strategyName}' strategy. Check details below.`,
      });

      // Simulate coding, debugging, backtesting - replace with actual logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Simulating strategy generation process...");

      // Simulate successful strategy notification (only if successful)
      const isSuccessful = Math.random() > 0.3; // Simulate success rate
      if (isSuccessful) {
         toast({
            title: "New Strategy Generated!",
            description: `Successfully coded, debugged, and backtested '${result.strategyName}'.`,
            variant: "default", // Use default style for success
          });
         // TODO: Add the new strategy to the StrategyTable (requires state management)
      } else {
           toast({
            title: "Strategy Generation Attempt Failed",
            description: `The suggested strategy '${result.strategyName}' did not pass backtesting.`,
            variant: "destructive",
          });
      }


    } catch (error) {
      console.error("Error generating strategy:", error);
      toast({
        title: "Generation Error",
        description: "Failed to generate or suggest strategy. Check console for details.",
        variant: "destructive",
      });
       setSuggestedConfig(null); // Clear suggestion on error
    } finally {
      setIsGenerating(false);
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
                  <Input placeholder="e.g., Bullish, Volatile, Sideways" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    placeholder='Paste JSON data here, e.g., [{"strategy": "Momentum", "profitFactor": 1.8, ...}]'
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Provide historical data for better suggestions. If blank, mock data will be used.</FormDescription>
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
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select schedule" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manual">Manual Trigger</SelectItem>
                    <SelectItem value="startup">On Startup</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>How often the agent should attempt generation.</FormDescription>
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
                    Automatically activate strategies that pass backtesting. Use with caution.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
                    placeholder="e.g., Focus on high-frequency strategies, avoid crypto assets..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>Add specific guidance for the strategy generation agent.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />


        <Button type="submit" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate & Test Strategy"
          )}
        </Button>
      </form>
    </Form>

     {/* Display Suggested Configuration */}
      {suggestedConfig && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Suggested Strategy Configuration</CardTitle>
            <CardDescription>Based on your input, the AI suggests the following:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <h4 className="font-semibold">Strategy Name:</h4>
                <p>{suggestedConfig.strategyName}</p>
            </div>
             <div>
                <h4 className="font-semibold">Configuration Options:</h4>
                <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {JSON.stringify(suggestedConfig.configurationOptions, null, 2)}
                </pre>
            </div>
             <div>
                <h4 className="font-semibold">Expected Return:</h4>
                <p>{suggestedConfig.expectedReturn}%</p>
            </div>
             <div>
                <h4 className="font-semibold">Risk Level:</h4>
                 <Badge variant={suggestedConfig.riskLevel === 'low' ? 'default' : suggestedConfig.riskLevel === 'medium' ? 'outline' : 'destructive'}>
                     {suggestedConfig.riskLevel.charAt(0).toUpperCase() + suggestedConfig.riskLevel.slice(1)}
                 </Badge>
            </div>
             <p className="text-xs text-muted-foreground pt-2">
                 Note: This is a suggestion. The agent will now attempt to code, debug, and backtest this configuration. You will be notified if it's successful.
             </p>
          </CardContent>
        </Card>
      )}
      </>
  );
}
