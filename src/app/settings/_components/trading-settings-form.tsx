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

const formSchema = z.object({
  defaultRiskPerTrade: z.coerce.number().min(0).max(10, {message: "Risk must be between 0 and 10%"}).describe("Default percentage of capital to risk per trade"),
  maxPortfolioDrawdown: z.coerce.number().min(1).max(50, {message: "Max drawdown must be between 1 and 50%"}).describe("Maximum allowed portfolio drawdown percentage"),
  preferredMarkets: z.string().min(1, { message: "Specify at least one market." }).describe("Comma-separated list of preferred markets (e.g., NYSE, NASDAQ, Crypto)"),
  defaultLeverage: z.coerce.number().min(1).max(100).optional().describe("Default leverage to use if applicable"),
});

type FormData = z.infer<typeof formSchema>;

export function TradingSettingsForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    // TODO: Fetch actual trading settings
    defaultValues: {
      defaultRiskPerTrade: 1,
      maxPortfolioDrawdown: 20,
      preferredMarkets: "NYSE, NASDAQ",
      defaultLeverage: 1,
    },
  });

  function onSubmit(values: FormData) {
    console.log("Trading settings submitted:", values);
    // TODO: Implement saving trading settings (likely to a config file on the backend)
    toast({
      title: "Settings Saved",
      description: "Your global trading settings have been updated.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
        <FormField
          control={form.control}
          name="defaultRiskPerTrade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Risk Per Trade (%)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 1" {...field} step="0.1" />
              </FormControl>
              <FormDescription>Percentage of capital to risk on a single trade by default.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="maxPortfolioDrawdown"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Portfolio Drawdown (%)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 20" {...field} />
              </FormControl>
              <FormDescription>Maximum acceptable loss from the portfolio peak.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredMarkets"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Markets</FormLabel>
              <FormControl>
                <Input placeholder="e.g., NYSE, NASDAQ, Crypto, Forex" {...field} />
              </FormControl>
              <FormDescription>Comma-separated list of markets to focus on.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="defaultLeverage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Leverage (Optional)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 10" {...field} min="1" step="1" />
              </FormControl>
              <FormDescription>Default leverage for strategies (if supported by broker).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
