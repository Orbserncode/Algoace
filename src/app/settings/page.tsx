// src/app/settings/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettingsForm } from "./_components/user-settings-form";
import { TradingSettingsForm } from "./_components/trading-settings-form";
import { AgentSettingsForm } from "./_components/agent-settings-form";
import { CredentialsForm } from "./_components/credentials-form"; // Handles both LLM and Broker now

export default function SettingsPage() {
  return (
    <Tabs defaultValue="user" className="space-y-4">
      <TabsList>
        <TabsTrigger value="user">User Profile</TabsTrigger>
        <TabsTrigger value="trading">Trading</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="credentials">Credentials</TabsTrigger>
      </TabsList>

      <TabsContent value="user">
        <Card>
          <CardHeader>
            <CardTitle>User Profile Settings</CardTitle>
            <CardDescription>Manage your account details and preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="trading">
        <Card>
          <CardHeader>
            <CardTitle>Trading Settings</CardTitle>
            <CardDescription>Configure global trading parameters, risk limits, and allowed trade types.</CardDescription>
          </CardHeader>
          <CardContent>
            <TradingSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agents">
        <Card>
          <CardHeader>
            <CardTitle>Agent Settings</CardTitle>
            <CardDescription>Configure default behaviors, LLM models, and parameters for your agents.</CardDescription>
          </CardHeader>
          <CardContent>
             <AgentSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

       <TabsContent value="credentials">
         {/* Credentials form now handles both LLM and Broker */}
        <Card>
          <CardHeader>
            <CardTitle>API Credentials</CardTitle>
            <CardDescription>Securely manage API keys for Brokers and LLM Providers.</CardDescription>
          </CardHeader>
          <CardContent>
            <CredentialsForm />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}
