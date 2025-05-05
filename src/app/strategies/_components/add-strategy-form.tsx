// src/app/strategies/_components/add-strategy-form.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { addStrategyWithFile, Strategy } from '@/services/strategies-service'; // Import updated service function

// Schema validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/x-python", "application/x-python-code", "text/plain"]; // MIME types for .py

const formSchema = z.object({
  name: z.string().min(3, { message: "Strategy name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  strategyFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Python file is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
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
  });

  // Handle file selection to display filename
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      // Manually trigger validation or update form state if needed, RHF might handle this via onChange
      form.setValue("strategyFile", files, { shouldValidate: true });
    } else {
      setFileName(null);
      form.setValue("strategyFile", undefined, { shouldValidate: true });
    }
  };


  async function onSubmit(values: FormData) {
    setIsSubmitting(true);
    const file = values.strategyFile[0];

    // Basic client-side file reading (example - content not sent in this mock)
    // In a real app, you'd likely send FormData or base64 to the backend.
    // const reader = new FileReader();
    // reader.onload = async (e) => {
    //    const fileContent = e.target?.result as string; // Use with caution, might be ArrayBuffer
       try {
          // Call the service function (currently mock)
          // Pass basic info + filename. Real app needs backend for file storage/processing.
          const newStrategy = await addStrategyWithFile({
              name: values.name,
              description: values.description,
              // status: 'Inactive', // Default status handled by service
              fileName: file.name,
              // fileContent: fileContent // Send content if backend handles it
          });

          toast({
              title: "Strategy Added",
              description: `Strategy "${newStrategy.name}" has been added (file upload simulated).`,
          });
          onStrategyAdded(newStrategy); // Call the success callback
          form.reset(); // Reset form fields
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
    // };
    // reader.onerror = (error) => {
    //     console.error("Error reading file:", error);
    //     toast({
    //         title: "File Read Error",
    //         description: "Could not read the uploaded file.",
    //         variant: "destructive",
    //     });
    //     setIsSubmitting(false);
    // };
    // reader.readAsText(file); // Or readAsDataURL if sending base64

     // Simpler mock without reading content (remove reader part above if using this)
     // await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network
     // try {
     //      const newStrategy = await addStrategyWithFile({
     //          name: values.name,
     //          description: values.description,
     //          fileName: file.name,
     //      });
     //      toast({ title: "Strategy Added", description: `Strategy "${newStrategy.name}" added (file upload simulated).` });
     //      onStrategyAdded(newStrategy);
     //      form.reset();
     //      setFileName(null);
     // } catch (error: any) {
     //      toast({ title: "Error", description: error.message || "Failed to add strategy.", variant: "destructive" });
     // } finally {
     //      setIsSubmitting(false);
     // }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
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
          control={form.control}
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
          control={form.control}
          name="strategyFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategy File (.py)</FormLabel>
              <FormControl>
                {/* Custom file input styling */}
                <div className="relative">
                   <Input
                      id="strategyFile"
                      type="file"
                      accept=".py,text/x-python,application/x-python-code"
                      onChange={handleFileChange} // Use custom handler
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" // Hide default input
                      disabled={isSubmitting}
                    />
                    <label
                        htmlFor="strategyFile"
                        className={cn(
                            "flex items-center justify-center w-full h-10 px-3 py-2 text-sm border border-input rounded-md cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground",
                            isSubmitting && "cursor-not-allowed opacity-50"
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
