// src/app/settings/_components/llm-provider-settings-form.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { BrainCircuit, Eye, EyeOff, CheckCircle, XCircle, Loader2, Link as LinkIcon, Server, PlusCircle, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { testLlmConnection, saveLlmConfig, getLlmConfigs, deleteLlmConfig } from '@/services/settings-service'; // Mock service
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Define known providers and their fields
const llmProviders = {
    google: { name: 'Google AI (Gemini)', fields: ['apiKey'], requires: ['apiKey'] },
    openai: { name: 'OpenAI (GPT)', fields: ['apiKey'], requires: ['apiKey'] },
    anthropic: { name: 'Anthropic (Claude)', fields: ['apiKey'], requires: ['apiKey'] },
    groq: { name: 'Groq', fields: ['apiKey'], requires: ['apiKey'] },
    local: { name: 'Local Model (Ollama/etc.)', fields: ['baseUrl', 'modelName'], requires: ['baseUrl', 'modelName'] }, // Example for local
} as const;

type LlmProviderKey = keyof typeof llmProviders;
type LlmConfig = z.infer<typeof formSchema>; // Use form schema as base for config type

const formSchema = z.object({
    providerId: z.string().optional(), // For editing existing configs
    providerType: z.custom<LlmProviderKey>((val) => typeof val === 'string' && Object.keys(llmProviders).includes(val), {
        message: "Please select a valid LLM provider.",
    }),
    apiKey: z.string().optional(),
    baseUrl: z.string().url({ message: "Please enter a valid URL (e.g., http://localhost:11434)." }).optional(),
    modelName: z.string().optional().describe("Specific model name if required (e.g., llama3, gpt-4)"),
}).refine(data => {
    // Conditional validation based on provider type
    const requiredFields = llmProviders[data.providerType]?.requires ?? [];
    return requiredFields.every(field => !!data[field as keyof typeof data]);
}, {
    message: "Required fields are missing for the selected provider.",
    // Path setting might need adjustment depending on how errors are shown
    path: ["apiKey"], // Default path, might need refinement based on which field is missing
});


export function LlmProviderSettingsForm() {
    const [showSecrets, setShowSecrets] = useState(false);
    const [isTesting, setIsTesting] = useState<string | null>(null); // Store ID of config being tested
    const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({}); // Store results by ID
    const [isSaving, setIsSaving] = useState(false);
    const [configs, setConfigs] = useState<LlmConfig[]>([]); // Store multiple configs
    const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
    const [selectedProviderType, setSelectedProviderType] = useState<LlmProviderKey | undefined>(undefined);

    const form = useForm<LlmConfig>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            providerType: undefined,
            apiKey: "",
            baseUrl: "",
            modelName: "",
        },
    });

    const { watch, reset, control, getValues, setValue, resetField } = form;

    // Fetch existing configs on mount
    useEffect(() => {
        const loadConfigs = async () => {
            setIsLoadingConfigs(true);
            try {
                const fetchedConfigs = await getLlmConfigs();
                setConfigs(fetchedConfigs);
            } catch (error) {
                toast({ title: "Error Loading LLM Configs", description: error instanceof Error ? error.message : "Could not load existing configurations.", variant: "destructive" });
            } finally {
                setIsLoadingConfigs(false);
            }
        };
        loadConfigs();
    }, []);

    // Watch for provider type changes in the form
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === 'providerType') {
                const newType = value.providerType as LlmProviderKey | undefined;
                setSelectedProviderType(newType);
                 // Reset fields not relevant to the new provider type
                 const relevantFields = newType ? llmProviders[newType].fields : [];
                 Object.keys(getValues()).forEach(key => {
                      // Keep providerType and providerId, reset others if not relevant
                     if (key !== 'providerType' && key !== 'providerId' && !relevantFields.includes(key as any)) {
                         resetField(key as keyof LlmConfig);
                     }
                 });
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, resetField, getValues]);


    const handleTestConnection = async (configToTest: LlmConfig) => {
        const configId = configToTest.providerId || 'new'; // Use 'new' for unsaved config
        setIsTesting(configId);
        setTestResults(prev => ({ ...prev, [configId]: null }));

        // Filter only relevant fields based on provider type
        const providerMeta = llmProviders[configToTest.providerType];
        if (!providerMeta) {
            toast({ title: "Invalid Provider", description: "Cannot test unknown provider type.", variant: "destructive" });
            setIsTesting(null);
            return;
        }
        const relevantData: Partial<LlmConfig> = { providerType: configToTest.providerType };
        providerMeta.fields.forEach(field => {
            relevantData[field as keyof LlmConfig] = configToTest[field as keyof LlmConfig];
        });


        try {
            console.log("Testing LLM connection with (masked apiKey):", { ...relevantData, apiKey: relevantData.apiKey ? '***' : '' });
            const result = await testLlmConnection(relevantData as LlmConfig); // Call mock service
            if (result.success) {
                setTestResults(prev => ({ ...prev, [configId]: 'success' }));
                toast({ title: "Connection Successful", description: result.message });
            } else {
                setTestResults(prev => ({ ...prev, [configId]: 'error' }));
                toast({ title: "Connection Failed", description: result.message, variant: "destructive" });
            }
        } catch (error) {
             setTestResults(prev => ({ ...prev, [configId]: 'error' }));
             toast({ title: "Connection Test Error", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
        } finally {
            setIsTesting(null);
        }
    };

    async function onSubmit(values: LlmConfig) {
        setIsSaving(true);

        // Filter only relevant fields based on provider type
        const providerMeta = llmProviders[values.providerType];
         if (!providerMeta) {
             toast({ title: "Invalid Provider", description: "Cannot save unknown provider type.", variant: "destructive" });
             setIsSaving(false);
             return;
         }
        const configToSave: Partial<LlmConfig> = { providerId: values.providerId, providerType: values.providerType };
         providerMeta.fields.forEach(field => {
             configToSave[field as keyof LlmConfig] = values[field as keyof LlmConfig];
         });

        console.log("Saving LLM config (masked apiKey):", { ...configToSave, apiKey: configToSave.apiKey ? '***' : '' });

        try {
            const savedConfig = await saveLlmConfig(configToSave as LlmConfig); // Call mock service
            toast({
                title: "Configuration Saved",
                description: `${savedConfig.providerId ? 'Updated' : 'Added'} configuration for ${llmProviders[savedConfig.providerType].name}.`,
            });
            // Update local state
            setConfigs(prev => {
                const existingIndex = prev.findIndex(c => c.providerId === savedConfig.providerId);
                if (existingIndex > -1) {
                    const updatedConfigs = [...prev];
                    updatedConfigs[existingIndex] = savedConfig;
                    return updatedConfigs;
                } else {
                    return [...prev, savedConfig];
                }
            });
            reset(); // Clear the form
            setSelectedProviderType(undefined); // Reset selected provider type
             setTestResults(prev => ({ ...prev, [savedConfig.providerId || 'new']: null })); // Clear test result for this config

        } catch (error) {
            toast({ title: "Error Saving Configuration", description: error instanceof Error ? error.message : "Could not save configuration.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }

     const handleDelete = async (providerId: string) => {
        // Add confirmation dialog if desired
        try {
             await deleteLlmConfig(providerId);
             toast({ title: "Configuration Deleted", description: `LLM configuration removed.` });
             setConfigs(prev => prev.filter(c => c.providerId !== providerId));
             // If the deleted config was being edited, clear the form
             if (form.getValues('providerId') === providerId) {
                 reset();
                 setSelectedProviderType(undefined);
             }
        } catch (error) {
             toast({ title: "Error Deleting", description: error instanceof Error ? error.message : "Could not delete configuration.", variant: "destructive" });
        }
    }

    // Function to load an existing config into the form for editing
    const editConfig = (config: LlmConfig) => {
         reset(config); // Load all config data into the form
         setSelectedProviderType(config.providerType); // Ensure dynamic fields update
         window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see the form
    }

     const renderField = (fieldName: string) => {
         if (!selectedProviderType || !llmProviders[selectedProviderType]?.fields.includes(fieldName as any)) {
             return null;
         }

         const isSecret = fieldName === 'apiKey';
         const isBaseUrl = fieldName === 'baseUrl';

         const fieldLabelMap: Record<string, string> = {
             apiKey: 'API Key',
             baseUrl: 'Base URL',
             modelName: 'Model Name (Optional)',
         };
         const fieldDescMap: Record<string, string> = {
             apiKey: `API Key for ${llmProviders[selectedProviderType].name}.`,
             baseUrl: `Base URL for the local API endpoint (e.g., Ollama). Include http/https.`,
             modelName: `Specific model identifier if needed by the provider/endpoint (e.g., llama3:latest, gpt-4).`,
         };

         return (
             <FormField
                 key={fieldName}
                 control={control}
                 name={fieldName as keyof LlmConfig}
                 render={({ field }) => (
                     <FormItem>
                         <FormLabel>{fieldLabelMap[fieldName]}</FormLabel>
                         <FormControl>
                             <Input
                                 type={isSecret && !showSecrets ? "password" : "text"}
                                 placeholder={`Enter ${fieldLabelMap[fieldName]}`}
                                 {...field}
                                 value={field.value || ''} // Ensure controlled component
                                 disabled={isSaving || !!isTesting}
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
          <BrainCircuit className="h-4 w-4" />
          <AlertTitle>LLM Configuration</AlertTitle>
          <AlertDescription>
            Manage connections to different LLM providers. API keys are stored securely in the backend. Changes may require an application restart. Agents will use the configured models based on their settings.
          </AlertDescription>
        </Alert>

         <Card className="mt-6">
            <CardHeader>
                <CardTitle>{form.getValues('providerId') ? 'Edit LLM Provider' : 'Add New LLM Provider'}</CardTitle>
                 <CardDescription>
                    {form.getValues('providerId')
                        ? `Modify the configuration for ${llmProviders[form.getValues('providerType')]?.name}.`
                        : "Select a provider type and enter its configuration details."}
                 </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={control}
                            name="providerType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Provider Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || ''} // Use value instead of defaultValue for controlled Select
                                        disabled={isSaving || !!isTesting || !!form.getValues('providerId')} // Disable changing type when editing
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose LLM provider..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.entries(llmProviders).map(([key, { name }]) => (
                                                <SelectItem key={key} value={key}>{name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedProviderType && (
                            <div className="space-y-4 mt-4">
                                 <div className="flex items-center justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSecrets(!showSecrets)}
                                        disabled={isSaving || !!isTesting}
                                    >
                                        {showSecrets ? <EyeOff className="mr-2 h-4 w-4"/> : <Eye className="mr-2 h-4 w-4"/>}
                                        {showSecrets ? 'Hide' : 'Show'} Secrets
                                    </Button>
                                 </div>

                                {/* Render relevant fields dynamically */}
                                {Object.keys(formSchema.shape)
                                    .filter(key => !['providerId', 'providerType'].includes(key))
                                    .map(fieldName => renderField(fieldName))
                                }

                                <div className="flex items-center space-x-4 pt-2">
                                    <Button
                                         type="button"
                                         variant="outline"
                                         onClick={() => handleTestConnection(getValues())}
                                         disabled={!!isTesting || isSaving || !selectedProviderType}
                                     >
                                         {isTesting === (getValues('providerId') || 'new') ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...
                                            </>
                                        ) : (
                                            <>
                                                <LinkIcon className="mr-2 h-4 w-4" /> Test Connection
                                            </>
                                        )}
                                    </Button>
                                    <Button type="submit" disabled={isSaving || !!isTesting || !selectedProviderType}>
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                                            </>
                                        ) : (
                                             form.getValues('providerId') ? "Update Configuration" : "Save Configuration"
                                        )}
                                    </Button>
                                     {form.getValues('providerId') && (
                                          <Button type="button" variant="ghost" onClick={() => { reset(); setSelectedProviderType(undefined); }} disabled={isSaving || !!isTesting}>
                                             Cancel Edit
                                          </Button>
                                     )}
                                     {testResults[getValues('providerId') || 'new'] === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                     {testResults[getValues('providerId') || 'new'] === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                                </div>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
         </Card>


         <Card className="mt-8">
             <CardHeader>
                 <CardTitle>Saved LLM Configurations</CardTitle>
                 <CardDescription>Manage your saved LLM provider connections.</CardDescription>
             </CardHeader>
             <CardContent>
                 {isLoadingConfigs ? (
                     <div className="flex items-center justify-center h-20">
                         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                         <span className="ml-2 text-muted-foreground">Loading configurations...</span>
                     </div>
                 ) : configs.length === 0 ? (
                     <p className="text-muted-foreground text-center py-4">No LLM providers configured yet.</p>
                 ) : (
                     <ScrollArea className="h-[300px] w-full">
                        <div className="space-y-4 pr-4">
                            {configs.map((config) => (
                                <div key={config.providerId} className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="flex-1 space-y-1 mr-4 overflow-hidden">
                                        <p className="font-medium truncate">
                                            {llmProviders[config.providerType]?.name || config.providerType}
                                            {config.providerType === 'local' && config.modelName && ` (${config.modelName})`}
                                        </p>
                                         <p className="text-sm text-muted-foreground truncate">
                                            {config.providerType === 'local' ? config.baseUrl : (config.apiKey ? 'API Key Set' : 'API Key Missing')}
                                        </p>
                                         {testResults[config.providerId!] === 'success' && <span className="text-xs text-green-600">Connection OK</span>}
                                         {testResults[config.providerId!] === 'error' && <span className="text-xs text-destructive">Connection Failed</span>}
                                    </div>
                                     <div className="flex items-center space-x-1">
                                         <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleTestConnection(config)}
                                              disabled={!!isTesting || isSaving}
                                              title="Test Connection"
                                          >
                                             {isTesting === config.providerId ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                                          </Button>
                                         <Button
                                             variant="outline"
                                             size="sm"
                                             onClick={() => editConfig(config)}
                                             disabled={!!isTesting || isSaving}
                                             title="Edit"
                                         >
                                             <Server className="h-4 w-4" />
                                         </Button>
                                         <Button
                                             variant="destructive"
                                             size="sm"
                                             onClick={() => handleDelete(config.providerId!)}
                                             disabled={!!isTesting || isSaving}
                                             title="Delete"
                                         >
                                             <Trash2 className="h-4 w-4" />
                                         </Button>
                                     </div>
                                </div>
                            ))}
                        </div>
                     </ScrollArea>
                 )}
             </CardContent>
         </Card>
    </>
  );
}
