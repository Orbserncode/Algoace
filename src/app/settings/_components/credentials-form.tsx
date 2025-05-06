// src/app/settings/_components/credentials-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Terminal, Eye, EyeOff, PlusCircle, Trash2, Server, Loader2, Link as LinkIcon, BrainCircuit, Edit, Settings2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getCredentials, saveCredentials, testLLMConnection, testBrokerConnection, LLMProviderConfig, BrokerConfig } from '@/services/settings-service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';


// --- LLM Provider Schema ---
const llmProviderSchema = z.object({
  id: z.string().optional(),
  providerType: z.enum(["google", "openai", "anthropic", "groq", "local"]),
  apiKey: z.string().optional(),
  apiUrl: z.string().url({ message: "Must be a valid URL for local provider" }).optional(),
  modelName: z.string().optional().describe("Specific model name (e.g., llama3, gpt-4)"),
}).refine(data => {
    if (data.providerType === "local" && !data.apiUrl) return false; // API URL required for local
    if (data.providerType !== "local" && !data.apiKey) return false; // API Key required for non-local
    return true;
}, {
    message: "API Key (for cloud) or API URL (for local) is required.",
    path: ["apiKey"], // Simplified path, better to specify conditionally
});
type LLMProviderFormData = z.infer<typeof llmProviderSchema>;

// --- Broker Schemas ---
const knownBrokerTypes = ["alpaca", "interactive_brokers", "coinbase", "kraken", "binance", "mock"] as const;
type BrokerType = typeof knownBrokerTypes[number];

const baseBrokerSchema = z.object({
    id: z.string().optional(),
    brokerType: z.enum(knownBrokerTypes),
});

const alpacaSchema = baseBrokerSchema.extend({
    brokerType: z.literal("alpaca"),
    apiKey: z.string().min(1, "API Key is required for Alpaca."),
    apiSecret: z.string().min(1, "API Secret is required for Alpaca."),
    paperTrading: z.boolean().default(true),
});

const ibkrSchema = baseBrokerSchema.extend({
     brokerType: z.literal("interactive_brokers"),
     accountNumber: z.string().min(1, "Account Number is required for IBKR."),
     host: z.string().optional().default("127.0.0.1"),
     port: z.coerce.number().optional().default(7497),
     clientId: z.coerce.number().optional().default(1),
});

const coinbaseSchema = baseBrokerSchema.extend({
    brokerType: z.literal("coinbase"),
    apiKey: z.string().min(1, "API Key is required for Coinbase."),
    apiSecret: z.string().min(1, "API Secret is required for Coinbase."),
});

const krakenSchema = baseBrokerSchema.extend({
    brokerType: z.literal("kraken"),
    apiKey: z.string().min(1, "API Key is required for Kraken."),
    apiSecret: z.string().min(1, "API Secret is required for Kraken."),
});

const binanceSchema = baseBrokerSchema.extend({
    brokerType: z.literal("binance"),
    apiKey: z.string().min(1, "API Key is required for Binance."),
    apiSecret: z.string().min(1, "API Secret is required for Binance."),
});

const mockBrokerSchema = baseBrokerSchema.extend({
    brokerType: z.literal("mock"),
});

const brokerUnionSchema = z.discriminatedUnion("brokerType", [
    alpacaSchema, ibkrSchema, coinbaseSchema, krakenSchema, binanceSchema, mockBrokerSchema
]);
type BrokerFormDataUnion = z.infer<typeof brokerUnionSchema>;

// --- Main Form Schema ---
const formSchema = z.object({
  llmProviders: z.array(llmProviderSchema).optional().default([]),
  brokerConfigs: z.array(brokerUnionSchema).optional().default([]),
  serpApiKey: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;


const getBrokerFieldConfig = (brokerType: BrokerType | undefined) => {
    switch (brokerType) {
        case 'alpaca': return [
            { name: 'apiKey', label: 'Alpaca API Key', type: 'password', required: true },
            { name: 'apiSecret', label: 'Alpaca API Secret', type: 'password', required: true },
            { name: 'paperTrading', label: 'Use Paper Trading', type: 'switch', required: false },
        ];
        case 'interactive_brokers': return [
            { name: 'accountNumber', label: 'IBKR Account Number', type: 'text', required: true },
            { name: 'host', label: 'Host (e.g., 127.0.0.1)', type: 'text', required: false },
            { name: 'port', label: 'Port (e.g., 7497)', type: 'number', required: false },
            { name: 'clientId', label: 'Client ID', type: 'number', required: false },
        ];
        case 'coinbase':
        case 'kraken':
        case 'binance': return [
            { name: 'apiKey', label: `${brokerType.charAt(0).toUpperCase() + brokerType.slice(1)} API Key`, type: 'password', required: true },
            { name: 'apiSecret', label: `${brokerType.charAt(0).toUpperCase() + brokerType.slice(1)} API Secret`, type: 'password', required: true },
        ];
        case 'mock': return [];
        default: return [];
    }
};


export function CredentialsForm() {
    const [showSecrets, setShowSecrets] = useState(false);
    const [isTesting, setIsTesting] = useState<{ type: 'llm' | 'broker', id: string } | null>(null);
    const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
          llmProviders: [],
          brokerConfigs: [],
          serpApiKey: "",
        },
    });

    const { fields: llmFields, append: appendLLM, remove: removeLLM, update: updateLLM } = useFieldArray({
        control: form.control, name: "llmProviders", keyName: "fieldId" // Use keyName to avoid conflicts
    });
    const { fields: brokerFields, append: appendBroker, remove: removeBroker, update: updateBroker } = useFieldArray({
        control: form.control, name: "brokerConfigs", keyName: "fieldId"
    });

    // Fetch existing credentials on load
    useEffect(() => {
        async function loadExistingCredentials() {
            setIsLoadingInitial(true);
            try {
                const creds = await getCredentials();
                form.reset({
                    llmProviders: creds.llmProviders.map(p => ({...p, apiKey: ""})) || [], // Redact API keys initially
                    brokerConfigs: creds.brokerConfigs.map(b => ({...b, apiKey: "", apiSecret: ""})) || [], // Redact
                    serpApiKey: creds.serpApiKey ? "" : undefined, // Redact
                });
            } catch (error) {
                toast({ title: "Error Loading Credentials", description: "Could not fetch existing configurations.", variant: "destructive" });
            } finally {
                setIsLoadingInitial(false);
            }
        }
        loadExistingCredentials();
    }, [form]);


    const handleTestConnection = async (type: 'llm' | 'broker', index: number) => {
        const config = type === 'llm' ? form.getValues(`llmProviders.${index}`) : form.getValues(`brokerConfigs.${index}`);
        const id = config.id || `temp-${type}-${index}`;
        if (!config) return;

        setIsTesting({ type, id });
        setTestResults(prev => ({ ...prev, [id]: null }));

        try {
            const result = type === 'llm'
                ? await testLLMConnection(config as LLMProviderConfig)
                : await testBrokerConnection(config as BrokerConfig);
            setTestResults(prev => ({ ...prev, [id]: 'success' }));
            toast({ title: `${type.toUpperCase()} Connection Successful`, description: result.message });
        } catch (error: any) {
            setTestResults(prev => ({ ...prev, [id]: 'error' }));
            toast({ title: `${type.toUpperCase()} Connection Failed`, description: error.message, variant: "destructive" });
        } finally {
            setIsTesting(null);
        }
    };

    async function onSubmit(values: FormData) {
        setIsSaving(true);
        console.log("Submitting credentials (secrets redacted for log):", {
            ...values,
            llmProviders: values.llmProviders?.map(p => ({ ...p, apiKey: p.apiKey ? '******' : '' })),
            brokerConfigs: values.brokerConfigs?.map(b => ({ ...b, apiKey: b.apiKey ? '******' : '', apiSecret: (b as any).apiSecret ? '******' : ''})),
            serpApiKey: values.serpApiKey ? '******' : '',
        });
        try {
            await saveCredentials(values);
            toast({ title: "Credentials Submitted", description: "Your credentials have been sent for update. Restart may be needed." });
            // Optionally, refetch credentials here to update form with potentially assigned IDs and redacted keys
        } catch (error: any) {
            toast({ title: "Failed to Save Credentials", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoadingInitial) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2">Loading credentials...</span>
            </div>
        );
    }

    return (
        <>
            <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                    Credentials are sent to the backend. Ensure secure handling. Leave API key fields blank to keep existing values if supported by backend.
                </AlertDescription>
            </Alert>

            <div className="flex justify-end mt-4">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowSecrets(!showSecrets)} disabled={isSaving || !!isTesting}>
                    {showSecrets ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                    {showSecrets ? 'Hide Secrets' : 'Show Secrets'}
                </Button>
            </div>

            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-6">

                {/* --- LLM Providers Section --- */}
                <Card>
                    <CardHeader>
                        <CardTitle>LLM Providers</CardTitle>
                        <CardDescription>Manage API keys for different Language Model providers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {llmFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No LLM providers configured.</p>}
                        <ScrollArea className={cn(llmFields.length > 2 ? "h-[400px]" : "")}>
                            <Accordion type="multiple" className="w-full space-y-4 pr-1">
                                {llmFields.map((item, index) => (
                                    <AccordionItem value={item.id || `llm-${index}`} key={item.fieldId} className="border rounded-md p-0">
                                        <div className="flex justify-between items-center px-4 py-2">
                                            <AccordionTrigger className="flex-1 text-left font-medium text-sm py-2 hover:no-underline">
                                                Provider #{index + 1}: {form.watch(`llmProviders.${index}.providerType`)?.toUpperCase()}
                                                {form.watch(`llmProviders.${index}.modelName`) && ` (${form.watch(`llmProviders.${index}.modelName`)})`}
                                            </AccordionTrigger>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLLM(index)} disabled={isSaving || !!isTesting} className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" /><span className="sr-only">Remove</span>
                                            </Button>
                                        </div>
                                        <AccordionContent className="space-y-4 px-4 pb-4 pt-0">
                                            <FormField control={form.control} name={`llmProviders.${index}.providerType`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Provider Type</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled={isSaving || !!isTesting}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="google">Google</SelectItem>
                                                            <SelectItem value="openai">OpenAI</SelectItem>
                                                            <SelectItem value="anthropic">Anthropic</SelectItem>
                                                            <SelectItem value="groq">Groq</SelectItem>
                                                            <SelectItem value="local">Local Model</SelectItem>
                                                        </SelectContent>
                                                    </Select><FormMessage />
                                                </FormItem>
                                            )} />
                                            {form.watch(`llmProviders.${index}.providerType`) === 'local' ? (
                                                <FormField control={form.control} name={`llmProviders.${index}.apiUrl`} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>API Base URL *</FormLabel>
                                                        <FormControl><Input type="url" placeholder="http://localhost:11434/v1" {...field} value={field.value ?? ''} disabled={isSaving || !!isTesting}/></FormControl>
                                                        <FormDescription>For local LLM APIs (Ollama, LM Studio, etc.).</FormDescription><FormMessage />
                                                    </FormItem>
                                                )} />
                                            ) : (
                                                <FormField control={form.control} name={`llmProviders.${index}.apiKey`} render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>API Key *</FormLabel>
                                                        <FormControl><Input type={showSecrets ? "text" : "password"} placeholder="Enter API Key" {...field} value={field.value ?? ''} disabled={isSaving || !!isTesting}/></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            )}
                                            <FormField control={form.control} name={`llmProviders.${index}.modelName`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Model Name (Optional)</FormLabel>
                                                    <FormControl><Input placeholder="e.g., llama3, gpt-4-turbo" {...field} value={field.value ?? ''} disabled={isSaving || !!isTesting}/></FormControl>
                                                    <FormDescription>Specific model identifier if needed.</FormDescription><FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="button" variant="outline" onClick={() => handleTestConnection('llm', index)} disabled={isSaving || !!isTesting}>
                                                {isTesting?.type === 'llm' && isTesting.id === (item.id || `temp-llm-${index}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />} Test
                                            </Button>
                                            {testResults[item.id || `temp-llm-${index}`] === 'success' && <CheckCircle className="h-5 w-5 text-green-500 inline ml-2" />}
                                            {testResults[item.id || `temp-llm-${index}`] === 'error' && <XCircle className="h-5 w-5 text-destructive inline ml-2" />}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendLLM({ providerType: "google", apiKey: "", modelName: "" })} disabled={isSaving || !!isTesting}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add LLM Provider
                        </Button>
                    </CardContent>
                </Card>

                {/* --- Broker Configurations Section --- */}
                <Card>
                    <CardHeader><CardTitle>Broker Configurations</CardTitle><CardDescription>Manage connections to your trading brokers.</CardDescription></CardHeader>
                    <CardContent>
                        {brokerFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No broker configurations added.</p>}
                        <ScrollArea className={cn(brokerFields.length > 1 ? "h-[400px]" : "")}>
                            <Accordion type="multiple" className="w-full space-y-4 pr-1">
                                {brokerFields.map((item, index) => (
                                     <AccordionItem value={item.id || `broker-${index}`} key={item.fieldId} className="border rounded-md p-0">
                                         <div className="flex justify-between items-center px-4 py-2">
                                            <AccordionTrigger className="flex-1 text-left font-medium text-sm py-2 hover:no-underline">
                                                Broker #{index + 1}: {form.watch(`brokerConfigs.${index}.brokerType`)?.toUpperCase()}
                                            </AccordionTrigger>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBroker(index)} disabled={isSaving || !!isTesting} className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" /><span className="sr-only">Remove</span>
                                            </Button>
                                        </div>
                                        <AccordionContent className="space-y-4 px-4 pb-4 pt-0">
                                            <FormField control={form.control} name={`brokerConfigs.${index}.brokerType`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Broker Type</FormLabel>
                                                    <Select onValueChange={(value) => {
                                                        const currentConfig = form.getValues(`brokerConfigs.${index}`);
                                                        // Reset specific fields based on type, preserve ID
                                                        form.setValue(`brokerConfigs.${index}`, { id: currentConfig.id, brokerType: value as BrokerType } as any, { shouldValidate: true });
                                                        field.onChange(value);
                                                    }} value={field.value} disabled={isSaving || !!isTesting || !!item.id}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="Select broker..." /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            {knownBrokerTypes.map(type => <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select><FormMessage />
                                                </FormItem>
                                            )} />
                                            {getBrokerFieldConfig(form.watch(`brokerConfigs.${index}.brokerType`)).map(brokerField => (
                                                <FormField key={brokerField.name} control={form.control} name={`brokerConfigs.${index}.${brokerField.name}` as any} render={({ field: currentField }) => (
                                                    <FormItem className={brokerField.type === 'switch' ? "flex flex-row items-center justify-between rounded-lg border p-3" : ""}>
                                                        <div className={brokerField.type === 'switch' ? "space-y-0.5" : ""}>
                                                            <FormLabel className={brokerField.type === 'switch' ? "text-sm" : ""}>{brokerField.label} {brokerField.required && '*'}</FormLabel>
                                                            {brokerField.type === 'switch' && <FormDescription className="text-xs">Enable paper trading mode.</FormDescription>}
                                                        </div>
                                                        <FormControl>
                                                            {brokerField.type === 'switch' ? (
                                                                <Switch checked={!!currentField.value} onCheckedChange={currentField.onChange} disabled={isSaving || !!isTesting} />
                                                            ) : (
                                                                <Input type={brokerField.type === 'password' && !showSecrets ? 'password' : brokerField.type} placeholder={`Enter ${brokerField.label}`} {...currentField} value={currentField.value ?? ''} onChange={e => currentField.onChange(brokerField.type === 'number' ? Number(e.target.value) || undefined : e.target.value)} disabled={isSaving || !!isTesting}/>
                                                            )}
                                                        </FormControl>
                                                        {brokerField.type !== 'switch' && <FormMessage />}
                                                    </FormItem>
                                                )} />
                                            ))}
                                            <Button type="button" variant="outline" onClick={() => handleTestConnection('broker', index)} disabled={isSaving || !!isTesting || !form.watch(`brokerConfigs.${index}.brokerType`)}>
                                                 {isTesting?.type === 'broker' && isTesting.id === (item.id || `temp-broker-${index}`) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />} Test
                                            </Button>
                                            {testResults[item.id || `temp-broker-${index}`] === 'success' && <CheckCircle className="h-5 w-5 text-green-500 inline ml-2" />}
                                            {testResults[item.id || `temp-broker-${index}`] === 'error' && <XCircle className="h-5 w-5 text-destructive inline ml-2" />}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </ScrollArea>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendBroker({ brokerType: "alpaca" } as any)} disabled={isSaving || !!isTesting}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Broker Configuration
                        </Button>
                    </CardContent>
                </Card>

                {/* --- SerpAPI Configuration --- */}
                <Card>
                    <CardHeader><CardTitle>Web Search (SerpAPI)</CardTitle><CardDescription>Configure API key for SerpAPI to enable web searching capabilities for agents.</CardDescription></CardHeader>
                    <CardContent>
                        <FormField control={form.control} name="serpApiKey" render={({ field }) => (
                            <FormItem>
                                <FormLabel>SerpAPI Key</FormLabel>
                                <FormControl><Input type={showSecrets ? "text" : "password"} placeholder="Enter SerpAPI Key" {...field} value={field.value ?? ''} disabled={isSaving || !!isTesting}/></FormControl>
                                <FormDescription>Needed for agents that perform web searches (e.g., Market Scanner for news).</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                <Separator />
                <Button type="submit" disabled={isSaving || !!isTesting}>
                     {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
                    Save All Credentials
                </Button>
            </form>
            </Form>
        </>
    );
}