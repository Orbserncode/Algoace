// src/app/strategies/_components/add-strategy-form.tsx
'use client';

import { useState, useRef } from 'react'; // Import useRef
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addStrategyWithFile, Strategy } from '@/services/strategies-service'; // Import updated service function
import { cn } from '@/lib/utils'; // Ensure cn is imported

// Schema validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/x-python", "application/x-python-code", "text/plain", ""]; // Allow empty type for some browser variations

// Use z.any() for server-side compatibility, refinements handle client-side checks
const formSchema = z.object({
  name: z.string().min(3, { message: "Strategy name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  strategyFile: z.any() // Use z.any() to avoid SSR error with FileList
    .refine((files): files is FileList => typeof window !== 'undefined' && files instanceof FileList && files.length > 0, "Python file is required.") // Check instance and length client-side
    .refine((files: FileList) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files: FileList) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      ".py file type is required."
    ),
});


type FormData = z.infer<typeof formSchema>;

interface AddStrategyFormProps {
  onStrategyAdded: (newStrategy: Strategy) => void; // Callback on success
}

export function AddStrategyForm({ onStrategyAdded }: AddStrategyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      strategyFile: undefined,
    },
     mode: "onChange", // Validate on change for better file feedback
  });

  const { register, handleSubmit, control, formState: { errors }, setValue, reset } = form;

  // Get register props for the file input
  const fileRef = register("strategyFile");

  // Handle file selection to display filename and update form state
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      setValue("strategyFile", files, { shouldValidate: true }); // Update RHF state
    } else {
      setFileName(null);
      setValue("strategyFile", undefined, { shouldValidate: true }); // Reset RHF state
    }
  };


  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    // FileList should contain the file due to client-side refinement
    const file = values.strategyFile[0];

     // Basic client-side file reading is not needed here as the service mock doesn't use it.
     // In a real app, you might read it or send FormData.

       try {
          // Call the service function (currently mock)
          // Pass basic info + filename. Real app needs backend for file storage/processing.
          const newStrategy = await addStrategyWithFile({
              name: values.name,
              description: values.description,
              fileName: file.name,
          });

          toast({
              title: "Strategy Added",
              description: `Strategy "${newStrategy.name}" has been added (file upload simulated).`,
          });
          onStrategyAdded(newStrategy); // Call the success callback
          reset(); // Reset form fields using RHF's reset
          setFileName(null); // Clear file name display

        } catch (error: any) {
          console.error("Error adding strategy:", error);
          toast({
              title: "Error Adding Strategy",
              description: error.message || "Could not add the strategy. Please try again.",
              variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
  }

  return (
    <Form {...form}>
      {/* Use onSubmit from RHF's handleSubmit */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={control} // Use control for structure
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategy Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., My Custom EMA Cross" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control} // Use control for structure
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the strategy's logic, markets, timeframe..." {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={control} // Use control for structure
            name="strategyFile" // RHF knows this field
            render={({ field }) => ( // 'field' is managed by RHF Controller, but we use register for props
            <FormItem>
              <FormLabel>Strategy File (.py)</FormLabel>
              <FormControl>
                {/* Custom file input styling */}
                <div className="relative">
                   <Input
                      id="strategyFile"
                      type="file"
                      accept=".py,text/x-python,application/x-python-code"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // Hide default input
                      disabled={isSubmitting}
                      {...fileRef} // Spread the register props (name, ref, onChange)
                      onChange={(e) => {
                           fileRef.onChange(e); // Call RHF's internal onChange
                           handleFileChange(e); // Call our custom handler
                      }}
                    />
                    <label
                        htmlFor="strategyFile"
                        className={cn(
                            "flex items-center justify-center w-full h-10 px-3 py-2 text-sm border border-input rounded-md cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground",
                            isSubmitting && "cursor-not-allowed opacity-50",
                             errors.strategyFile && "border-destructive text-destructive" // Indicate error on the label
                        )}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        <span>{fileName || "Choose Lumibot Python file..."}</span>
                    </label>
                </div>
              </FormControl>
              <FormDescription>
                Upload a Python file compatible with the Lumibot framework. Max 5MB.
              </FormDescription>
              {/* FormMessage will display errors based on RHF state */}
              <FormMessage />
            </FormItem>
           )}
         />
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Strategy...
            </>
          ) : (
            "Add Strategy"
          )}
        </Button>
      </form>
    </Form>
  );
}
