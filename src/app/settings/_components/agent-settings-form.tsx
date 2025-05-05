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
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  strategyAgentModel: z.string().min(1, {message: "Model selection required"}).default("googleai/gemini-2.0-flash").describe("LLM model for the Strategy Coding Agent"),
  strategyAgentSchedule: z.enum(["manual", "daily", "weekly", "startup"]).default("manual").describe("Default schedule for the Strategy Coding Agent"),
  executionAgentRetryAttempts: z.coerce.number().int().min(0).max(10).default(3).describe("Default number of retry attempts for execution agents"),
  dataAgentFrequency: z.coerce.number().int().min(1).max(60).default(5).describe("Default data fetching frequency in minutes for data agents"),
  enableAgentLogging: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function AgentSettingsForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    // TODO: Fetch actual agent settings
    defaultValues: {
      strategyAgentModel: "googleai/gemini-2.0-flash", // Match the default in ai-instance
      strategyAgentSchedule: "manual",
      executionAgentRetryAttempts: 3,
      dataAgentFrequency: 5,
      enableAgentLogging: true,
    },
  });

  function onSubmit(values: FormData) {
    console.log("Agent settings submitted:", values);
    // TODO: Implement saving agent settings (likely to a config file on the backend)
    toast({
      title: "Settings Saved",
      description: "Your default agent settings have been updated.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
         <FormField
            control={form.control}
            name="strategyAgentModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strategy Agent LLM Model</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select LLM model" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {/* These should ideally be fetched or configured */}
                        <SelectItem value="googleai/gemini-2.0-flash">Gemini 2.0 Flash (Default)</SelectItem>
                        <SelectItem value="googleai/gemini-1.5-pro">Gemini 1.5 Pro</SelectItem>
                        <SelectItem value="openai/gpt-4">GPT-4 (Requires Key)</SelectItem>
                        <SelectItem value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Requires Key)</SelectItem>
                    </SelectContent>
                </Select>
                <FormDescription>The language model used by the Strategy Coding Agent.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
            control={form.control}
            name="strategyAgentSchedule"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Strategy Generation Schedule</FormLabel>
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
                <FormDescription>Default frequency for automated strategy generation attempts.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="executionAgentRetryAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Execution Agent Retry Attempts</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 3" {...field} min="0" max="10" step="1" />
              </FormControl>
              <FormDescription>Default number of times execution agents retry failed orders.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
          control={form.control}
          name="dataAgentFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data Agent Fetch Frequency (Minutes)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 5" {...field} min="1" max="60" step="1" />
              </FormControl>
              <FormDescription>Default interval for data agents to fetch new market data.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormField
            control={form.control}
            name="enableAgentLogging"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Enable Detailed Agent Logging
                  </FormLabel>
                  <FormDescription>
                    Record detailed logs for all agent activities. Can consume more disk space.
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

        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
