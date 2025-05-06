// src/app/settings/_components/broker-settings-form.tsx
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Eye, EyeOff, CheckCircle, XCircle, Loader2, Link as LinkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { testBrokerConnection, saveBrokerConfig } from '@/services/settings-service'; // Mock service

// Define known brokers and their required fields
const brokers = {
    alpaca: { name: 'Alpaca', fields: ['apiKey', 'apiSecret', 'paperTrading'] },
    interactive_brokers: { name: 'Interactive Brokers', fields: ['host', 'port', 'accountNumber'] },
    tradier: { name: 'Tradier', fields: ['apiKey', 'accountNumber', 'paperTrading'] },
    coinbase: { name: 'Coinbase Advanced Trade', fields: ['apiKey', 'apiSecret'] },
    // Add other Lumibot compatible brokers
} as const;

type BrokerKey = keyof typeof brokers;

const formSchema = z.object({
  broker: z.custom<BrokerKey>((val) => typeof val === 'string' && Object.keys(brokers).includes(val), {
      message: "Please select a valid broker.",
  }).optional(),
  apiKey: z.string().optional().describe("API Key for the selected broker"),
  apiSecret: z.string().optional().describe("API Secret for the selected broker"),
  accountNumber: z.string().optional().describe("Account Number for the selected broker"),
  host: z.string().optional().describe("Host address for Interactive Brokers"),
  port: z.string().optional().describe("Port number for Interactive Brokers"),
  paperTrading: z.boolean().default(false).describe("Enable paper trading mode"),
});

type FormData = z.infer<typeof formSchema>;

export function BrokerSettingsForm() {
    const [showSecrets, setShowSecrets] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedBroker, setSelectedBroker] = useState<BrokerKey | undefined>(undefined);

    // Form setup - does NOT fetch values from backend for security.
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            broker: undefined,
            apiKey: "",
            apiSecret: "",
            accountNumber: "",
            host: "",
            port: "",
            paperTrading: false,
        },
    });

    const { watch, resetField, getValues } = form;

    // Watch for broker changes to show relevant fields
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === 'broker') {
                const newBroker = value.broker as BrokerKey | undefined;
                setSelectedBroker(newBroker);
                // Reset fields not relevant to the new broker
                const relevantFields = newBroker ? brokers[newBroker].fields : [];
                Object.keys(getValues()).forEach(key => {
                    if (key !== 'broker' && !relevantFields.includes(key as any)) {
                        resetField(key as keyof FormData);
                    }
                });
                setTestResult(null); // Clear test result on broker change
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, resetField, getValues]);

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        const values = form.getValues();
        const currentBroker = values.broker;

        if (!currentBroker) {
            toast({ title: "Select Broker", description: "Please select a broker first.", variant: "destructive" });
            setIsTesting(false);
            return;
        }

        // Prepare credentials based on selected broker
        const credentials: Record<string, any> = { type: currentBroker };
        brokers[currentBroker].fields.forEach(field => {
            credentials[field] = values[field as keyof FormData];
        });

        try {
            console.log("Testing connection with (masked):", { ...credentials, apiKey: credentials.apiKey ? '***' : '', apiSecret: credentials.apiSecret ? '***' : '' });
            const result = await testBrokerConnection(credentials); // Call mock service
            if (result.success) {
                setTestResult('success');
                toast({ title: "Connection Successful", description: result.message });
            } else {
                setTestResult('error');
                toast({ title: "Connection Failed", description: result.message, variant: "destructive" });
            }
        } catch (error) {
            setTestResult('error');
            toast({ title: "Connection Test Error", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsTesting(false);
        }
    };

    async function onSubmit(values: FormData) {
        setIsSaving(true);
        const currentBroker = values.broker;

        if (!currentBroker) {
            toast({ title: "Select Broker", description: "Please select a broker to save.", variant: "destructive" });
            setIsSaving(false);
            return;
        }

        // Prepare credentials based on selected broker
        const configToSave: Record<string, any> = { type: currentBroker };
        brokers[currentBroker].fields.forEach(field => {
            const value = values[field as keyof FormData];
             // Only include fields that have been filled (or are boolean like paperTrading)
             if (typeof value === 'boolean' || (value !== "" && value !== undefined && value !== null)) {
                configToSave[field] = value;
            }
        });


        console.log("Submitting broker config (masked):", { ...configToSave, apiKey: configToSave.apiKey ? '***' : '', apiSecret: configToSave.apiSecret ? '***' : '' });

        try {
            await saveBrokerConfig(configToSave); // Call mock service
            toast({
                title: "Configuration Submitted",
                description: `Broker configuration for ${brokers[currentBroker].name} sent for update. Restart may be required.`,
            });
            // Optionally clear sensitive fields after submission
            brokers[currentBroker].fields.forEach(field => {
                if (field === 'apiKey' || field === 'apiSecret') {
                     resetField(field as keyof FormData);
                }
            });
            setTestResult(null); // Clear test status after saving
        } catch (error) {
            toast({ title: "Error Saving Configuration", description: error instanceof Error ? error.message : "Could not save configuration.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    const renderField = (fieldName: string) => {
        if (!selectedBroker || !brokers[selectedBroker].fields.includes(fieldName as any)) {
            return null;
        }

        const isSecret = fieldName === 'apiSecret';
        const isApiKey = fieldName === 'apiKey';
        const isPaperTrading = fieldName === 'paperTrading';
        const isPort = fieldName === 'port';

        const fieldLabelMap: Record<string, string> = {
            apiKey: 'API Key',
            apiSecret: 'API Secret',
            paperTrading: 'Paper Trading',
            accountNumber: 'Account Number',
            host: 'Host/IP Address',
            port: 'Port'
        };
        const fieldDescMap: Record<string, string> = {
            apiKey: `Your ${brokers[selectedBroker].name} API key.`,
            apiSecret: `Your ${brokers[selectedBroker].name} API secret.`,
            paperTrading: `Enable paper trading mode for ${brokers[selectedBroker].name}.`,
            accountNumber: `Your ${brokers[selectedBroker].name} account number.`,
            host: 'The host address for your Interactive Brokers TWS or Gateway.',
            port: 'The port number for your Interactive Brokers TWS or Gateway (e.g., 7497 for paper, 7496 for live).'
        };

        if (isPaperTrading) {
            return (
                <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName as keyof FormData}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                    {fieldLabelMap[fieldName]}
                                </FormLabel>
                                <FormDescription>
                                    {fieldDescMap[fieldName]}
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value as boolean}
                                    onCheckedChange={field.onChange}
                                    disabled={isSaving || isTesting}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }

        return (
            <FormField
                key={fieldName}
                control={form.control}
                name={fieldName as keyof FormData}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{fieldLabelMap[fieldName]}</FormLabel>
                        <FormControl>
                            <Input
                                type={(isSecret || isApiKey) && !showSecrets ? "password" : isPort ? "number" : "text"}
                                placeholder={`Enter ${fieldLabelMap[fieldName]} or leave blank`}
                                {...field}
                                value={field.value || ''} // Ensure controlled component
                                disabled={isSaving || isTesting}
                            />
                        </FormControl>
                        <FormDescription>{fieldDescMap[fieldName]}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        );
    };


  return (
      <>
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            Broker credentials should be updated via secure backend actions that modify environment variables or a configuration store. Never expose secrets directly. Leave fields blank to keep existing values. Restart the application after saving changes.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-6 max-w-lg">

             <FormField
                control={form.control}
                name="broker"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Select Broker</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving || isTesting}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a broker..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {Object.entries(brokers).map(([key, { name }]) => (
                                    <SelectItem key={key} value={key}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>Select a broker compatible with Lumibot.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
             />

             {selectedBroker && (
                 <div className="space-y-6 border-t pt-6 mt-6">
                     <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Configure {brokers[selectedBroker].name}</h3>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecrets(!showSecrets)}
                            disabled={isSaving || isTesting}
                        >
                            {showSecrets ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                            {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                        </Button>
                     </div>

                    {/* Render relevant fields dynamically */}
                    {Object.keys(formSchema.shape)
                        .filter(key => key !== 'broker') // Exclude the broker selector itself
                        .map(fieldName => renderField(fieldName))
                    }

                     <div className="flex items-center space-x-4">
                        <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting || isSaving || !selectedBroker}>
                             {isTesting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                                </>
                            ) : (
                                 <>
                                    <LinkIcon className="mr-2 h-4 w-4" /> Test Connection
                                </>
                             )}
                        </Button>
                         <Button type="submit" disabled={isSaving || isTesting || !selectedBroker}>
                             {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                </>
                             ) : (
                                "Save Configuration"
                             )}
                        </Button>
                         {testResult === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                         {testResult === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>
                </div>
             )}
          </form>
        </Form>
    </>
  );
}
