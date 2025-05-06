import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSettingsForm } from "./_components/user-settings-form";
import { TradingSettingsForm } from "./_components/trading-settings-form";
import { AgentSettingsForm } from "./_components/agent-settings-form";
import { BrokerSettingsForm } from "./_components/broker-settings-form"; // Renamed from CredentialsForm
import { LlmProviderSettingsForm } from "./_components/llm-provider-settings-form"; // New form

export default function SettingsPage() {
  return (
    <Tabs defaultValue="user" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        <TabsTrigger value="user">User Profile</TabsTrigger>
        <TabsTrigger value="trading">Trading</TabsTrigger>
        <TabsTrigger value="agents">Agents</TabsTrigger>
        <TabsTrigger value="brokers">Brokers</TabsTrigger> {/* Updated from Credentials */}
        <TabsTrigger value="llms">LLMs</TabsTrigger> {/* New tab */}
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
            <CardDescription>Configure global trading parameters, risk limits, and AI overrides.</CardDescription>
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
            <CardDescription>Configure default behaviors and parameters for your agents.</CardDescription>
          </CardHeader>
          <CardContent>
             <AgentSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

       <TabsContent value="brokers"> {/* Updated value */}
        <Card>
          <CardHeader>
            <CardTitle>Broker Configuration</CardTitle> {/* Updated title */}
            <CardDescription>Securely manage API credentials for supported brokers (stored in backend).</CardDescription> {/* Updated description */}
          </CardHeader>
          <CardContent>
            <BrokerSettingsForm /> {/* Renamed component */}
          </CardContent>
        </Card>
      </TabsContent>

       <TabsContent value="llms"> {/* New content */}
        <Card>
          <CardHeader>
            <CardTitle>LLM Provider Configuration</CardTitle>
            <CardDescription>Configure API keys and endpoints for Large Language Model providers.</CardDescription>
          </CardHeader>
          <CardContent>
            <LlmProviderSettingsForm />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );
}
