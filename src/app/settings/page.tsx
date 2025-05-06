// src/app/settings/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettingsForm } from "./_components/user-settings-form";
import { TradingSettingsForm } from "./_components/trading-settings-form";
import { AgentSettingsForm } from "./_components/agent-settings-form";
import { CredentialsForm } from "./_components/credentials-form"; // Handles LLM, Broker, and SerpAPI

export default function SettingsPage() {
  return (
    <Tabs defaultValue="user" className="space-y-4">
      <TabsList>
        <TabsTrigger value="user">User Profile</TabsTrigger>
        <TabsTrigger value="trading">Trading Rules</TabsTrigger> {/* Renamed for clarity */}
        <TabsTrigger value="agents">Agent Defaults</TabsTrigger> {/* Renamed for clarity */}
        <TabsTrigger value="credentials">API Credentials</TabsTrigger> {/* Renamed for clarity */}
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
            <CardTitle>Global Trading Rules</CardTitle>
            <CardDescription>Configure global trading parameters, risk limits, and allowed trade types. These can be overridden by AI suggestions or specific agent settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <TradingSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agents">
        <Card>
          <CardHeader>
            <CardTitle>Default Agent Settings</CardTitle>
            <CardDescription>Configure default behaviors and parameters for various agent types. Specific agents can override these.</CardDescription>
          </CardHeader>
          <CardContent>
             <AgentSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

       <TabsContent value="credentials">
        <Card>
          <CardHeader>
            <CardTitle>API Credentials & Connections</CardTitle>
            <CardDescription>Securely manage API keys for LLM Providers, Brokers, and other third-party services like SerpAPI.</CardDescription>
          </CardHeader>
          <CardContent>
            <CredentialsForm />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}