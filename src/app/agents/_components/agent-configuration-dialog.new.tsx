// src/app/agents/_components/agent-configuration-dialog.new.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlusCircle, Trash2, Code, BrainCircuit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Agent, 
  AgentConfig, 
  getAgentConfig, 
  updateAgentConfig, 
  getSchemaForAgentType,
  availableTools, 
  ToolName,
  DependenciesSchema
} from '@/services/agents-service.new';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JsonInput } from './json-input';
import { cn } from '@/lib/utils';
import { getAvailableLlmModels, getConfiguredBrokers, LLMProviderConfig, BrokerConfig } from '@/services/settings-service';
import { getAvailableAssets as fetchBrokerAssets } from '@/services/broker-service'; // For fetching assets per broker
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface AgentConfigurationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onConfigSaved: (updatedAgent: Agent) => void;
}

export function AgentConfigurationDialog({ isOpen, onOpenChange, agent, onConfigSaved }: AgentConfigurationDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingLlmModels, setIsLoadingLlmModels] = useState(false);
  const [availableLlmModels, setAvailableLlmModels] = useState<string[]>([]);
  const [configuredBrokers, setConfiguredBrokers] = useState<BrokerConfig[]>([]);
  const [brokerAssetCache, setBrokerAssetCache] = useState<Record<string, string[]>>({}); // Cache for broker assets { brokerId: ['asset1', 'asset2'] }
  const [activeTab, setActiveTab] = useState("basic");

  // Get the appropriate schema for this agent type
  const formSchema = getSchemaForAgentType(agent.type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  // For watched assets in Data Agent
  const { fields: watchedAssetsFields, append: appendWatchedAsset, remove: removeWatchedAsset } = useFieldArray({
    control: form.control,
    name: "watched_assets" as any, // Type assertion for conditional field
  });

  // Fetch initial data: agent config, LLM providers, configured brokers
  useEffect(() => {
    async function loadInitialData() {
      if (!isOpen || !agent) return;
      setIsLoadingConfig(true);
      setIsLoadingLlmModels(true); // Assume loading models as well

      try {
        const [fetchedConfig, fetchedBrokers] = await Promise.all([
          getAgentConfig(agent.id),
          getConfiguredBrokers(), // Fetch configured brokers
        ]);

        setConfiguredBrokers(fetchedBrokers);

        if (fetchedConfig) {
          const validatedConfig = formSchema.parse(fetchedConfig);
          form.reset(validatedConfig);
          if ('llm_provider' in validatedConfig && validatedConfig.llm_provider) {
            const models = await getAvailableLlmModels(validatedConfig.llm_provider);
            setAvailableLlmModels(models);
          }
        } else {
          const defaults = formSchema.parse({});
          form.reset(defaults);
          toast({ title: "Config Not Found", description: "Using default configuration values.", variant: "default"});
        }
      } catch (error) {
        console.error("Error loading agent config or related data:", error);
        toast({ title: "Error Loading Data", description: `Could not load initial data. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
        onOpenChange(false);
      } finally {
        setIsLoadingConfig(false);
        setIsLoadingLlmModels(false);
      }
    }
    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agent, formSchema]); // form.reset is safe inside useEffect if deps are correct

  // Fetch LLM models when provider changes
  const selectedLlmProvider = form.watch('llm_provider' as any);
  useEffect(() => {
    async function fetchModelsForProvider() {
      if (!selectedLlmProvider) {
        setAvailableLlmModels([]);
        return;
      }
      setIsLoadingLlmModels(true);
      try {
        const models = await getAvailableLlmModels(selectedLlmProvider);
        setAvailableLlmModels(models);
      } catch (error) {
        console.error("Error fetching LLM models for provider:", error);
        setAvailableLlmModels([]);
        toast({ title: "Error Fetching Models", description: "Could not load LLM models for the selected provider.", variant: "destructive" });
      } finally {
        setIsLoadingLlmModels(false);
      }
    }
    fetchModelsForProvider();
  }, [selectedLlmProvider, toast]);

  // Fetch assets when a broker is selected for a watched asset
  const handleBrokerChangeForAsset = async (assetIndex: number, brokerId: string) => {
    if (!brokerId || brokerAssetCache[brokerId]) return; // Already cached or no broker
    try {
      const assets = await fetchBrokerAssets(brokerId);
      setBrokerAssetCache(prev => ({ ...prev, [brokerId]: assets }));
    } catch (error) {
      console.error(`Error fetching assets for broker ${brokerId}:`, error);
      toast({ title: "Error Fetching Assets", description: `Could not load assets for broker.`, variant: "destructive" });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    console.log("Saving agent config:", values);
    try {
      const updatedConfig = await updateAgentConfig(agent.id, values);
      if (updatedConfig) {
        const updatedAgent = { ...agent, config: updatedConfig };
        onConfigSaved(updatedAgent);
        onOpenChange(false); // Close dialog on success
        toast({ title: "Configuration Saved", description: "Agent configuration has been updated successfully." });
      } else {
        throw new Error("Failed to update configuration on the backend.");
      }
    } catch (error: any) {
      toast({
        title: "Error Saving Config",
        description: `Could not save configuration: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Render form fields based on schema
  const renderFormField = (fieldName: string, fieldSchema: any) => {
    const description = fieldSchema.description || '';
    const label = fieldName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Auto-label

    // System Prompt (Textarea)
    if (fieldName === 'system_prompt') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={`Enter ${label}...`} 
                className="min-h-[150px] font-mono text-sm" 
                {...field} 
                value={field.value || ''} 
                disabled={isSaving}
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // LLM Provider Selection
    if (fieldName === 'llm_provider') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select 
              onValueChange={(value) => { 
                field.onChange(value); 
                form.setValue('llm_model' as any, ''); 
              }} 
              value={field.value} 
              disabled={isSaving || isLoadingConfig}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Select LLM provider..." /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="groq">Groq</SelectItem>
                <SelectItem value="local">Local</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // LLM Model Selection
    if (fieldName === 'llm_model') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ''} 
              disabled={isSaving || isLoadingLlmModels || !selectedLlmProvider}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingLlmModels ? "Loading models..." : "Select model..."} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {isLoadingLlmModels && <div className="p-2 text-sm text-muted-foreground">Loading...</div>}
                {!isLoadingLlmModels && availableLlmModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
                {!isLoadingLlmModels && availableLlmModels.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">No models found or provider not selected.</div>
                )}
              </SelectContent>
            </Select>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Broker Selection (for Execution Agent)
    if (fieldName === 'broker_id' && agent.type === 'Execution Agent') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value || ''} 
              disabled={isSaving || isLoadingConfig || configuredBrokers.length === 0}
            >
              <FormControl><SelectTrigger><SelectValue placeholder="Select configured broker..." /></SelectTrigger></FormControl>
              <SelectContent>
                {configuredBrokers.map(b => (
                  <SelectItem key={b.id} value={b.id!}>
                    {b.brokerType.toUpperCase()} ({b.paperTrading ? "Paper" : "Live"})
                  </SelectItem>
                ))}
                {configuredBrokers.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground">No brokers configured in settings.</div>
                )}
              </SelectContent>
            </Select>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Watched Assets (for Data Agent)
    if (fieldName === 'watched_assets' && agent.type === 'Data Agent') {
      return (
        <div key={fieldName} className="space-y-4 p-4 border rounded-md">
          <FormLabel className="text-base font-medium">{label}</FormLabel>
          <FormDescription>{description}</FormDescription>
          {watchedAssetsFields.map((assetField, index) => (
            <div key={assetField.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-3 border rounded-md relative">
              <FormField 
                control={form.control} 
                name={`watched_assets.${index}.broker_id` as any} 
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Broker</FormLabel>
                    <Select 
                      onValueChange={(value) => { 
                        field.onChange(value); 
                        handleBrokerChangeForAsset(index, value); 
                        form.setValue(`watched_assets.${index}.symbol` as any, ''); 
                      }} 
                      value={field.value} 
                      disabled={isSaving || isLoadingConfig}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Broker..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {configuredBrokers.map(b => (
                          <SelectItem key={b.id} value={b.id!}>
                            {b.brokerType.toUpperCase()} ({b.paperTrading ? "Paper" : "Live"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name={`watched_assets.${index}.symbol` as any} 
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Asset Symbol</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={isSaving || !form.watch(`watched_assets.${index}.broker_id` as any)}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Asset..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(brokerAssetCache[form.watch(`watched_assets.${index}.broker_id` as any)] || []).map(asset => (
                          <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                        ))}
                        {!brokerAssetCache[form.watch(`watched_assets.${index}.broker_id` as any)] && (
                          <div className="p-2 text-sm">Select broker to load assets.</div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => removeWatchedAsset(index)} 
                disabled={isSaving || watchedAssetsFields.length <= 1} 
                className="col-span-1 md:col-span-auto text-destructive hover:text-destructive self-center justify-self-end absolute top-1 right-1 md:static"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove Asset</span>
              </Button>
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => appendWatchedAsset({ broker_id: '', symbol: '' })} 
            disabled={isSaving}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Asset to Watch
          </Button>
        </div>
      );
    }

    // Enabled Tools Selection
    if (fieldName === 'enabled_tools') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem className="space-y-3 p-4 border rounded-md">
            <FormLabel className="text-base font-medium">{label}</FormLabel>
            <FormDescription>{description}</FormDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableTools.map((tool) => (
                <FormField key={tool.name} control={form.control} name={fieldName} render={({ field: itemField }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md hover:bg-muted/50">
                    <FormControl>
                      <Checkbox
                        checked={(itemField.value as ToolName[])?.includes(tool.name)}
                        onCheckedChange={(checked) => {
                          const currentValue = (itemField.value as ToolName[]) || [];
                          return checked
                            ? itemField.onChange([...currentValue, tool.name])
                            : itemField.onChange(currentValue.filter(name => name !== tool.name));
                        }}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">{tool.name}</FormLabel>
                      <FormDescription className="text-xs">{tool.description}</FormDescription>
                    </div>
                  </FormItem>
                )} />
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Dependencies as JSON Input
    if (fieldName === 'dependencies') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <JsonInput 
                value={field.value || {}} 
                onChange={field.onChange} 
                placeholder={`Enter JSON for ${label}...`} 
                disabled={isSaving} 
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Enum as Select
    if (fieldSchema.typeName === 'ZodEnum') {
      const options = fieldSchema._def.values as string[];
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
              <FormControl><SelectTrigger><SelectValue placeholder={`Select ${label}...`} /></SelectTrigger></FormControl>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option} value={option}>
                    {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Boolean as Switch
    if (fieldSchema.typeName === 'ZodBoolean') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">{label}</FormLabel>
              <FormDescription>{description}</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Number Input
    if (fieldSchema.typeName === 'ZodNumber') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder={`Enter ${label}...`} 
                {...field} 
                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                value={field.value ?? ''} 
                min={fieldSchema._def.minValue ?? undefined}
                max={fieldSchema._def.maxValue ?? undefined}
                step={fieldSchema._def.checks?.find((c: any) => c.kind === 'int') ? 1 : undefined}
                disabled={isSaving} 
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Array of Strings as comma-separated Input
    if (fieldSchema.typeName === 'ZodArray' && fieldSchema._def.type.typeName === 'ZodString') {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label} (comma-separated)</FormLabel>
            <FormControl>
              <Input 
                placeholder={`e.g., VAL1, VAL2`} 
                value={Array.isArray(field.value) ? field.value.join(', ') : ''} 
                onChange={e => field.onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])} 
                disabled={isSaving} 
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Prompt Templates as Textarea
    const isPromptField = (
      fieldName.toLowerCase().includes('prompt') ||
      fieldName.toLowerCase().includes('template')
    );
    if (fieldSchema.typeName === 'ZodString' && isPromptField) {
      return (
        <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={`Enter ${label}...`} 
                className="min-h-[150px] font-mono text-sm" 
                {...field} 
                value={field.value ?? ''} 
                disabled={isSaving} 
              />
            </FormControl>
            <FormDescription>{description}</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
      );
    }

    // Default String Input
    return (
      <FormField key={fieldName} control={form.control} name={fieldName} render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input 
              placeholder={`Enter ${label}...`} 
              {...field} 
              value={field.value ?? ''} 
              disabled={isSaving} 
            />
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )} />
    );
  };

  // Group fields by category for tabs
  const groupFieldsByCategory = () => {
    // Cast to ZodObject to access shape property
    const schema = (formSchema as z.ZodObject<any>).shape;
    const fields = Object.entries(schema);
    
    const basicFields = [
      'system_prompt', 
      'llm_provider', 
      'llm_model', 
      'retries', 
      'instrument', 
      'log_level'
    ];
    
    const toolsFields = [
      'enabled_tools'
    ];
    
    const advancedFields = fields
      .filter(([name]) => !basicFields.includes(name) && !toolsFields.includes(name))
      .map(([name]) => name);
    
    return {
      basic: fields.filter(([name]) => basicFields.includes(name)),
      tools: fields.filter(([name]) => toolsFields.includes(name)),
      advanced: fields.filter(([name]) => advancedFields.includes(name)),
    };
  };

  const fieldGroups = groupFieldsByCategory();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure: {agent.name}</DialogTitle>
          <DialogDescription>
            Adjust settings for "{agent.type}" using Pydantic-AI framework. Restart agent for changes to take effect.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4" />
              <span>Basic</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              <span>Tools</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 pr-6 -mr-6 max-h-[60vh] overflow-y-auto">
            {isLoadingConfig ? (
              <div className="flex justify-center items-center h-60">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading config...</span>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-1">
                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle>Basic Configuration</CardTitle>
                        <CardDescription>Configure the core settings for this agent</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {fieldGroups.basic.map(([name, schema]) => renderFormField(name, schema))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="tools" className="space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle>Tools Configuration</CardTitle>
                        <CardDescription>Configure which tools this agent can use</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {fieldGroups.tools.map(([name, schema]) => renderFormField(name, schema))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="advanced" className="space-y-4 mt-0">
                    <Card>
                      <CardHeader>
                        <CardTitle>Advanced Configuration</CardTitle>
                        <CardDescription>Configure advanced settings specific to this agent type</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {fieldGroups.advanced.map(([name, schema]) => renderFormField(name, schema))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </form>
              </Form>
            )}
          </ScrollArea>
        </Tabs>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving || isLoadingConfig}>
              Cancel
            </Button>
          </DialogClose>
          <Button 
            type="button" 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isSaving || isLoadingConfig || !form.formState.isDirty}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}