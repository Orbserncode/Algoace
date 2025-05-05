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
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Eye, EyeOff } from "lucide-react";

// Define schema for form fields, not necessarily matching .env structure directly
const formSchema = z.object({
  brokerApiKey: z.string().optional().describe("API Key for your primary broker (e.g., Lumibot)"),
  brokerApiSecret: z.string().optional().describe("API Secret for your primary broker"),
  dataProviderKey: z.string().optional().describe("API Key for your market data provider"),
  genAIApiKey: z.string().optional().describe("API Key for Google AI (Gemini)"), // Added field for Gemini key
});

type FormData = z.infer<typeof formSchema>;

export function CredentialsForm() {
    const [showSecrets, setShowSecrets] = useState(false);

  // This form DOES NOT fetch values from .env for security reasons.
  // It only provides fields to potentially UPDATE the .env file via a secure backend action.
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brokerApiKey: "",
      brokerApiSecret: "",
      dataProviderKey: "",
      genAIApiKey: "", // Initialize empty
    },
  });

  function onSubmit(values: FormData) {
    console.log("Credentials form submitted (values will NOT be logged here for security):", {
        brokerApiKey: values.brokerApiKey ? '******' : '',
        brokerApiSecret: values.brokerApiSecret ? '******' : '',
        dataProviderKey: values.dataProviderKey ? '******' : '',
        genAIApiKey: values.genAIApiKey ? '******' : '',
    });
    // VERY IMPORTANT: Implement a secure backend function to update the .env file.
    // DO NOT handle .env updates directly in the frontend.
    // Example: await updateEnvFileSecurely(values);
    toast({
      title: "Credentials Submitted",
      description: "Your credentials have been sent for update (requires backend action). Restart the application if necessary.",
    });
     // Optionally clear fields after submission for added security
     form.reset();
  }

  return (
      <>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            These credentials will be used to attempt updating your backend <code>.env</code> file.
            Ensure your backend is configured to handle this securely. Never expose your <code>.env</code> file contents directly to the frontend. Leave fields blank to keep existing values.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 max-w-lg">
             <div className="flex justify-end">
                 <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                >
                    {showSecrets ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                    {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                </Button>
             </div>
            <FormField
              control={form.control}
              name="brokerApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker API Key (e.g., Lumibot)</FormLabel>
                  <FormControl>
                    <Input type={showSecrets ? "text" : "password"} placeholder="Enter new API Key or leave blank" {...field} />
                  </FormControl>
                  <FormDescription>Your primary trading broker API key.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerApiSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Broker API Secret</FormLabel>
                  <FormControl>
                    <Input type={showSecrets ? "text" : "password"} placeholder="Enter new API Secret or leave blank" {...field} />
                  </FormControl>
                   <FormDescription>Your primary trading broker API secret.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dataProviderKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Data Provider API Key (Optional)</FormLabel>
                  <FormControl>
                     <Input type={showSecrets ? "text" : "password"} placeholder="Enter new Key or leave blank" {...field} />
                  </FormControl>
                   <FormDescription>API key for your market data source.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
              control={form.control}
              name="genAIApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google AI (Gemini) API Key</FormLabel>
                  <FormControl>
                     <Input type={showSecrets ? "text" : "password"} placeholder="Enter new Key or leave blank" {...field} />
                  </FormControl>
                   <FormDescription>Required for the Strategy Coding Agent.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Update Credentials (Requires Backend Action)</Button>
          </form>
        </Form>
    </>
  );
}
