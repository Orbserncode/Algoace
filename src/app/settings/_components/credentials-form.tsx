// src/app/settings/_components/credentials-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Terminal, Eye, EyeOff, PlusCircle, Trash2, Server, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
// Placeholder services - replace with actual backend interaction
import { testLLMConnection, testBrokerConnection, saveCredentials } from '@/services/settings-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch'; // Import Switch

// --- LLM Provider Schema ---
const llmProviderSchema = z.object({
  id: z.string().optional(), // Optional ID for existing providers
  providerType: z.enum(["google", "openai", "anthropic", "groq", "local"]),
  apiKey: z.string().optional(),
  apiUrl: z.string().optional().describe("Required for 'local' provider type"), // Base URL for local models
});
type LLMProviderFormData = z.infer<typeof llmProviderSchema>;

// --- Broker Schemas ---
const knownBrokers = ["alpaca", "interactive_brokers", "coinbase", "kraken", "binance", "mock"] as const;
type BrokerType = typeof knownBrokers[number];

// Individual Broker Schemas
const alpacaSchema = z.object({
    brokerType: z.literal("alpaca"),
    apiKey: z.string().min(1, "API Key is required for Alpaca."),
    apiSecret: z.string().min(1, "API Secret is required for Alpaca."),
    paperTrading: z.boolean().default(true),
});

const ibkrSchema = z.object({
     brokerType: z.literal("interactive_brokers"),
     accountNumber: z.string().min(1, "Account Number is required for IBKR."),
     host: z.string().optional().default("127.0.0.1"),
     port: z.coerce.number().optional().default(7497), // Default TWS Paper port
     clientId: z.coerce.number().optional().default(1), // Default Client ID
});

const coinbaseSchema = z.object({
    brokerType: z.literal("coinbase"),
    apiKey: z.string().min(1, "API Key is required for Coinbase."),
    apiSecret: z.string().min(1, "API Secret is required for Coinbase."),
    // Add passphrase if needed for specific Coinbase API versions
});

const krakenSchema = z.object({
    brokerType: z.literal("kraken"),
    apiKey: z.string().min(1, "API Key is required for Kraken."),
    apiSecret: z.string().min(1, "API Secret is required for Kraken."),
    // Add specific Kraken fields if necessary
});

const binanceSchema = z.object({
    brokerType: z.literal("binance"),
    apiKey: z.string().min(1, "API Key is required for Binance."),
    apiSecret: z.string().min(1, "API Secret is required for Binance."),
    // Add specific Binance fields (e.g., subaccount, testnet flag) if necessary
});

const mockSchema = z.object({
    brokerType: z.literal("mock"),
    // No specific fields needed for mock
});

// Use a discriminated union for the broker part of the form
const brokerSchema = z.discriminatedUnion("brokerType", [
    alpacaSchema,
    ibkrSchema,
    coinbaseSchema,
    krakenSchema,
    binanceSchema,
    mockSchema
]);
type BrokerFormData = z.infer<typeof brokerSchema>;


// --- Main Form Schema ---
const formSchema = z.object({
  llmProviders: z.array(llmProviderSchema).optional(),
  brokerConfig: brokerSchema.optional(), // Broker config is optional initially
});
type FormData = z.infer<typeof formSchema>;


// Helper to get placeholder/label based on broker type
const getBrokerFieldConfig = (brokerType: BrokerType | undefined) => {
    switch (brokerType) {
        case 'alpaca': return [
            { name: 'apiKey', label: 'Alpaca API Key', type: 'password', required: true },
            { name: 'apiSecret', label: 'Alpaca API Secret', type: 'password', required: true },
            { name: 'paperTrading', label: 'Use Paper Trading', type: 'switch', required: false }, // Assuming switch for boolean
        ];
        case 'interactive_brokers': return [
            { name: 'accountNumber', label: 'IBKR Account Number', type: 'text', required: true },
            { name: 'host', label: 'Host (e.g., 127.0.0.1)', type: 'text', required: false },
            { name: 'port', label: 'Port (e.g., 7497 for Paper TWS)', type: 'number', required: false },
            { name: 'clientId', label: 'Client ID', type: 'number', required: false },
        ];
        case 'coinbase': return [
            { name: 'apiKey', label: 'Coinbase API Key', type: 'password', required: true },
            { name: 'apiSecret', label: 'Coinbase API Secret', type: 'password', required: true },
        ];
        case 'kraken': return [
            { name: 'apiKey', label: 'Kraken API Key', type: 'password', required: true },
            { name: 'apiSecret', label: 'Kraken API Secret', type: 'password', required: true },
            // Add passphrase or 2FA setup instructions if relevant
        ];
        case 'binance': return [
            { name: 'apiKey', label: 'Binance API Key', type: 'password', required: true },
            { name: 'apiSecret', label: 'Binance API Secret', type: 'password', required: true },
            // Add testnet/subaccount fields if needed
        ];
         case 'mock': return []; // No fields needed for mock broker
        default: return [];
    }
};


export function CredentialsForm() {
    const [showSecrets, setShowSecrets] = useState(false);
    const [isTestingLLM, setIsTestingLLM] = useState<string | null>(null); // Store index being tested
    const [isTestingBroker, setIsTestingBroker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // TODO: Fetch existing credentials on load
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
        // Initialize with one empty Google provider by default? Or fetch existing.
         llmProviders: [{ providerType: "google", apiKey: "", apiUrl: "" }],
         // Broker config starts empty or fetched
         brokerConfig: undefined, // No default broker selected
        },
    });

     const { fields: llmFields, append: appendLLM, remove: removeLLM } = useFieldArray({
        control: form.control,
        name: "llmProviders",
    });

    const selectedBrokerType = form.watch('brokerConfig.brokerType'); // Watch the selected broker type

    // Handle Test Connection for LLM
    const handleTestLLM = async (index: number) => {
        const providerData = form.getValues(`llmProviders.${index}`);
        if (!providerData) return;

        setIsTestingLLM(index.toString()); // Set loading state for this specific provider
        try {
             // Call placeholder service function
            const result = await testLLMConnection(providerData as LLMProviderFormData); // Type assertion needed
            toast({
                title: "LLM Connection Test Successful",
                description: `Successfully connected to ${providerData.providerType}. ${result.message || ''}`,
            });
        } catch (error: any) {
            toast({
                title: "LLM Connection Test Failed",
                description: `Could not connect to ${providerData.providerType}: ${error.message || 'Unknown error'}`,
                variant: "destructive",
            });
        } finally {
            setIsTestingLLM(null);
        }
    };

     // Handle Test Connection for Broker
    const handleTestBroker = async () => {
        const brokerData = form.getValues('brokerConfig');
        if (!brokerData?.brokerType) {
            toast({ title: "No Broker Selected", description: "Please select a broker type first.", variant: "destructive" });
            return;
        }

        setIsTestingBroker(true);
        try {
             // Call placeholder service function
            const result = await testBrokerConnection(brokerData as BrokerFormData); // Type assertion might be needed depending on service
             toast({
                 title: "Broker Connection Test Successful",
                 description: `Successfully connected to ${brokerData.brokerType}. ${result.message || ''}`,
             });
        } catch (error: any) {
             toast({
                 title: "Broker Connection Test Failed",
                 description: `Could not connect to ${brokerData.brokerType}: ${error.message || 'Unknown error'}`,
                 variant: "destructive",
             });
        } finally {
            setIsTestingBroker(false);
        }
    };


    // Handle Form Submission (Save Credentials)
    async function onSubmit(values: FormData) {
        setIsSaving(true);
         console.log("Attempting to save credentials (secrets redacted):", {
            llmProviders: values.llmProviders?.map(p => ({ ...p, apiKey: p.apiKey ? '******' : '' })),
             brokerConfig: values.brokerConfig ? { ...values.brokerConfig, apiKey: values.brokerConfig.apiKey ? '******' : '', apiSecret: (values.brokerConfig as any).apiSecret ? '******' : '' } : undefined,
         });

         // IMPORTANT: Send *only necessary* and potentially changed data to the backend.
         // The backend should securely handle saving/updating to .env or a secure config store.
         // Never pass all form data if it includes unchanged sensitive fields.
         try {
            await saveCredentials(values); // Pass potentially filtered/transformed values
             toast({
                title: "Credentials Submitted",
                description: "Your credentials have been sent for update. Restart may be needed.",
             });
             // Optionally clear fields after successful save for security
             // form.reset(); // Decide if resetting is desired UX
         } catch (error: any) {
             toast({
                 title: "Failed to Save Credentials",
                 description: `Error saving credentials: ${error.message || 'Unknown error'}`,
                 variant: "destructive",
             });
         } finally {
             setIsSaving(false);
         }
    }

    return (
        <>
            <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Security Notice</AlertTitle>
            <AlertDescription>
                Credentials entered here are sent to the backend for storage (e.g., in <code>.env</code> or a secure config).
                Ensure your backend handles this securely. Leave fields blank to keep existing values if the backend supports merging.
            </AlertDescription>
            </Alert>

             <div className="flex justify-end mt-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecrets(!showSecrets)}
                    disabled={isSaving || isTestingBroker || isTestingLLM !== null}
                >
                    {showSecrets ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                    {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                </Button>
             </div>

            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">

                {/* --- Broker Configuration --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>Broker Configuration</CardTitle>
                        <CardDescription>Connect to your trading broker (powered by Lumibot integrations).</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="brokerConfig.brokerType" // Name matches the discriminated union key
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Broker</FormLabel>
                                     <Select
                                         onValueChange={(value) => {
                                             // Reset brokerConfig fields when type changes, keeping brokerType
                                             const newConfig = { brokerType: value as BrokerType };
                                             form.setValue('brokerConfig', newConfig as any, { shouldValidate: true }); // Use 'as any' due to discriminated union complexity for RHF setValue
                                             field.onChange(value);
                                         }}
                                         value={field.value || ""} // Handle undefined initial value
                                         disabled={isSaving || isTestingBroker}
                                     >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select broker..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                             {knownBrokers.map(broker => (
                                                <SelectItem key={broker} value={broker}>
                                                    {/* Simple capitalization for display */}
                                                    {broker.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </SelectItem>
                                             ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dynamically render fields based on selectedBrokerType */}
                        {selectedBrokerType && getBrokerFieldConfig(selectedBrokerType).map(brokerField => (
                             <FormField
                                key={brokerField.name}
                                control={form.control}
                                name={`brokerConfig.${brokerField.name}` as any} // Use 'as any' for dynamic names, ensure backend validation
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{brokerField.label} {brokerField.required && '*'}</FormLabel>
                                        <FormControl>
                                             {brokerField.type === 'switch' ? (
                                                <Switch
                                                    // Ensure value is boolean, default to false if undefined
                                                    checked={!!field.value}
                                                    onCheckedChange={field.onChange}
                                                    disabled={isSaving || isTestingBroker}
                                                />
                                             ) : (
                                                <Input
                                                    type={brokerField.type === 'password' && !showSecrets ? 'password' : 'text'}
                                                    placeholder={`Enter ${brokerField.label}`}
                                                    {...field}
                                                     // Ensure value is a string for input, handle potential number conversion if needed (or use coerce in schema)
                                                     value={field.value ?? ''}
                                                     onChange={(e) => field.onChange(brokerField.type === 'number' ? Number(e.target.value) || 0 : e.target.value)}
                                                    disabled={isSaving || isTestingBroker}
                                                />
                                            )}
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ))}

                         {selectedBrokerType && (
                            <Button type="button" variant="outline" onClick={handleTestBroker} disabled={isSaving || isTestingBroker}>
                                {isTestingBroker ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                                Test Broker Connection
                            </Button>
                         )}

                    </CardContent>
                </Card>


                {/* --- LLM Provider Configuration --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>LLM Provider Configuration</CardTitle>
                         <CardDescription>Manage API keys for different Language Model providers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="multiple" className="w-full space-y-4">
                            {llmFields.map((item, index) => (
                                <AccordionItem value={`item-${index}`} key={item.id} className="border rounded-md p-4">
                                     <div className="flex justify-between items-center mb-2">
                                        <AccordionTrigger className="flex-1 text-left font-medium text-sm py-2">
                                            LLM Provider #{index + 1}: {form.watch(`llmProviders.${index}.providerType`)?.toUpperCase()}
                                        </AccordionTrigger>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLLM(index)}
                                            disabled={llmFields.length <= 1 || isSaving || isTestingLLM !== null} // Prevent removing the last one
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                             <span className="sr-only">Remove Provider</span>
                                        </Button>
                                    </div>
                                    <AccordionContent className="space-y-4 pt-2">
                                        <FormField
                                            control={form.control}
                                            name={`llmProviders.${index}.providerType`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Provider Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSaving || isTestingLLM !== null}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select provider..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="google">Google (Gemini)</SelectItem>
                                                            <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                                                            <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                                            <SelectItem value="groq">Groq</SelectItem>
                                                            <SelectItem value="local">Local Model</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                         {form.watch(`llmProviders.${index}.providerType`) === 'local' && (
                                             <FormField
                                                control={form.control}
                                                name={`llmProviders.${index}.apiUrl`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>API Base URL *</FormLabel>
                                                        <FormControl>
                                                             <Input type="url" placeholder="e.g., http://localhost:11434/v1" {...field} value={field.value ?? ''} disabled={isSaving || isTestingLLM !== null}/>
                                                        </FormControl>
                                                         <FormDescription>The base URL for your local LLM API (e.g., Ollama, LM Studio).</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                         )}
                                         {/* API Key is optional for local models */}
                                         {form.watch(`llmProviders.${index}.providerType`) !== 'local' && (
                                              <FormField
                                                control={form.control}
                                                name={`llmProviders.${index}.apiKey`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>API Key *</FormLabel>
                                                        <FormControl>
                                                            <Input type={showSecrets ? "text" : "password"} placeholder="Enter API Key" {...field} value={field.value ?? ''} disabled={isSaving || isTestingLLM !== null}/>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                         <Button type="button" variant="outline" onClick={() => handleTestLLM(index)} disabled={isSaving || isTestingLLM !== null}>
                                            {isTestingLLM === index.toString() ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                                            Test Connection
                                        </Button>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                         <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() => appendLLM({ providerType: "google", apiKey: "", apiUrl: "" })} // Append a default new provider
                            disabled={isSaving || isTestingLLM !== null}
                         >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add LLM Provider
                        </Button>
                    </CardContent>
                </Card>


                <Separator />

                {/* --- Save All Button --- */}
                <Button type="submit" disabled={isSaving || isTestingBroker || isTestingLLM !== null}>
                     {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save All Credentials
                </Button>
            </form>
            </Form>
        </>
    );
}

// Ensure components are exported
// export { Switch }; // Removed export as it's likely already exported from ui index
