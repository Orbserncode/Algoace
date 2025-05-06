// src/app/agents/_components/agent-configuration-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Agent, AgentConfig, getAgentConfig, updateAgentConfig, StrategyCodingAgentConfigSchema, ExecutionAgentConfigSchema, DataAgentConfigSchema, AnalysisAgentConfigSchema, BaseAgentConfigSchema } from '@/services/agents-service'; // Import schemas and services
import { ScrollArea } from '@/components/ui/scroll-area';
import { JsonInput } from './json-input'; // Assuming a JsonInput component exists or is created

interface AgentConfigurationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onConfigSaved: (updatedAgent: Agent) => void; // Callback after successful save
}

export function AgentConfigurationDialog({ isOpen, onOpenChange, agent, onConfigSaved }: AgentConfigurationDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [currentConfig, setCurrentConfig] = useState<AgentConfig | null>(null);

  // Determine the correct schema based on agent type
  const getConfigSchema = (type: Agent['type']): z.ZodType<any, any, any> => {
    switch (type) {
      case 'Strategy Coding Agent': return StrategyCodingAgentConfigSchema;
      case 'Execution Agent': return ExecutionAgentConfigSchema;
      case 'Data Agent': return DataAgentConfigSchema;
      case 'Analysis Agent': return AnalysisAgentConfigSchema;
      default: return BaseAgentConfigSchema; // Fallback schema
    }
  };

  const formSchema = getConfigSchema(agent.type);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // Default values will be loaded from fetched config
  });

  // Fetch current config when dialog opens or agent changes
  useEffect(() => {
     async function loadConfig() {
         if (!isOpen || !agent) return;
         setIsLoadingConfig(true);
         try {
             const fetchedConfig = await getAgentConfig(agent.id);
             if (fetchedConfig) {
                 // Validate fetched config against the schema and set form values
                 const validatedConfig = formSchema.parse(fetchedConfig);
                 form.reset(validatedConfig); // Populate form with fetched values
                 setCurrentConfig(validatedConfig);
             } else {
                 // Handle case where config is missing - use schema defaults
                 const defaults = formSchema.parse({});
                 form.reset(defaults);
                 setCurrentConfig(defaults);
                 toast({ title: "Config Not Found", description: "Using default configuration values.", variant: "default"});
             }
         } catch (error) {
              console.error("Error loading agent config:", error);
             toast({ title: "Error Loading Config", description: `Could not load configuration for ${agent.name}. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
             // Close dialog or show error state? Closing for now.
             onOpenChange(false);
         } finally {
             setIsLoadingConfig(false);
         }
     }
     loadConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, agent, formSchema]); // Re-run if dialog opens, agent changes, or schema changes (though schema is derived)


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSaving(true);
    console.log("Saving agent config:", values);
    try {
        // Call the service to update the config
        const updatedConfig = await updateAgentConfig(agent.id, values);
        if (updatedConfig) {
            // Update the agent object with the new config for the callback
            const updatedAgent = { ...agent, config: updatedConfig };
            onConfigSaved(updatedAgent);
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

   // --- Dynamic Form Field Rendering ---
   const renderFormField = (fieldName: string, fieldSchema: z.ZodTypeAny, fieldProps?: any) => {
        const description = fieldSchema.description || ''; // Get description from Zod schema

        // Handle different Zod types
        if (fieldSchema instanceof z.ZodEnum) {
            const options = fieldSchema.options as string[];
            return (
                <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{fieldProps?.label || fieldName}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={`Select ${fieldName}...`} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {options.map(option => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormDescription>{description}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }

        if (fieldSchema instanceof z.ZodBoolean) {
             return (
                <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">{fieldProps?.label || fieldName}</FormLabel>
                                <FormDescription>{description}</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSaving}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }

        if (fieldSchema instanceof z.ZodNumber) {
             return (
                <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{fieldProps?.label || fieldName}</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder={`Enter ${fieldName}...`}
                                    {...field}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} // Handle empty string for optional numbers
                                    value={field.value ?? ''} // Handle undefined value
                                    min={fieldSchema.minValue ?? undefined}
                                    max={fieldSchema.maxValue ?? undefined}
                                    step={fieldSchema.isInt ? 1 : undefined}
                                    disabled={isSaving}
                                />
                            </FormControl>
                            <FormDescription>{description}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            );
        }

         if (fieldSchema instanceof z.ZodArray && fieldSchema.element instanceof z.ZodString) {
             // Render array of strings as comma-separated input for simplicity
             return (
                 <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{fieldProps?.label || fieldName} (comma-separated)</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder={`e.g., VAL1, VAL2, VAL3`}
                                     // Convert array to string for input, string to array on change
                                    value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                                    onChange={e => field.onChange(e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : [])}
                                    disabled={isSaving}
                                />
                            </FormControl>
                            <FormDescription>{description}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
             );
         }


         // Handle long strings (prompts) with Textarea
         const isLongString = (fieldName.toLowerCase().includes('prompt') || fieldName.toLowerCase().includes('instructions'));
         if (fieldSchema instanceof z.ZodString && isLongString) {
             return (
                 <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{fieldProps?.label || fieldName}</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder={`Enter ${fieldName}...`}
                                    className="min-h-[150px] font-mono text-xs" // Style for prompts
                                    {...field}
                                    disabled={isSaving}
                                />
                            </FormControl>
                            <FormDescription>{description}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                 />
             );
         }


        // Default to string input
         return (
             <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{fieldProps?.label || fieldName}</FormLabel>
                        <FormControl>
                             <Input
                                placeholder={`Enter ${fieldName}...`}
                                {...field}
                                value={field.value ?? ''} // Handle undefined
                                disabled={isSaving}
                            />
                        </FormControl>
                        <FormDescription>{description}</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
             />
        );
   };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure: {agent.name}</DialogTitle>
          <DialogDescription>
            Adjust the settings for the "{agent.type}". Changes will be applied the next time the agent runs or restarts.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6"> {/* Allow content to scroll */}
            {isLoadingConfig ? (
                 <div className="flex justify-center items-center h-40">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                     <span className="ml-2 text-muted-foreground">Loading configuration...</span>
                 </div>
            ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                      {/* Dynamically render form fields based on the schema */}
                       {Object.entries(formSchema.shape as z.ZodRawShape).map(([name, schema]) =>
                          renderFormField(name, schema)
                       )}
                  </form>
                </Form>
            )}
        </ScrollArea>
         <DialogFooter>
             <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSaving || isLoadingConfig}>
                     Cancel
                 </Button>
             </DialogClose>
             {/* Trigger form submission */}
             <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving || isLoadingConfig}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Changes
             </Button>
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Helper component for JSON input (basic example)
interface JsonInputProps {
    value?: Record<string, any>;
    onChange: (value: Record<string, any> | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

function JsonInput({ value, onChange, placeholder, disabled, className }: JsonInputProps) {
    const [textValue, setTextValue] = useState(() => value ? JSON.stringify(value, null, 2) : '');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Update text area if the external value changes
        setTextValue(value ? JSON.stringify(value, null, 2) : '');
    }, [value]);

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = event.target.value;
        setTextValue(newText);
        try {
            if (newText.trim() === '') {
                onChange(undefined); // Clear value if empty
                setError(null);
            } else {
                const parsed = JSON.parse(newText);
                onChange(parsed);
                setError(null);
            }
        } catch (e) {
            setError("Invalid JSON format.");
            // Optionally call onChange with undefined or keep last valid value
            // onChange(undefined);
        }
    };

    return (
        <div className="w-full">
            <Textarea
                value={textValue}
                onChange={handleChange}
                placeholder={placeholder || 'Enter JSON...'}
                disabled={disabled}
                className={cn("font-mono text-xs min-h-[100px]", className, error && "border-destructive")}
            />
            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
    );
}

    