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
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  username: z.string().min(2, { message: "Username must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  notificationsEnabled: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export function UserSettingsForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    // TODO: Fetch actual user settings
    defaultValues: {
      username: "AlgoTrader",
      email: "user@example.com",
      notificationsEnabled: true,
    },
  });

  function onSubmit(values: FormData) {
    console.log("User settings submitted:", values);
    // TODO: Implement saving user settings
    toast({
      title: "Settings Saved",
      description: "Your user profile settings have been updated.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} />
              </FormControl>
              <FormDescription>This is your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Your email address" {...field} />
              </FormControl>
              <FormDescription>Used for notifications and account recovery.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
            control={form.control}
            name="notificationsEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Enable Notifications
                  </FormLabel>
                  <FormDescription>
                    Receive email notifications for important events (e.g., successful strategy generation, critical errors).
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                 <FormMessage />
              </FormItem>
            )}
          />
        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
