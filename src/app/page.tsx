import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, LineChart, Bot, Terminal, Settings } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Welcome to AlgoAce Trader</CardTitle>
          <CardDescription>Your multi-agent hedge fund trading platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Manage your trading strategies, monitor performance, configure agents, and control the platform through the CLI or this web interface.
          </p>
        </CardContent>
      </Card>

      <FeatureCard
        title="Strategies"
        description="Configure, manage, and backtest trading strategies."
        icon={<FileCode className="h-6 w-6" />}
        link="/strategies"
        linkText="Manage Strategies"
      />

      <FeatureCard
        title="Monitoring"
        description="Track real-time performance and market data."
        icon={<LineChart className="h-6 w-6" />}
        link="/monitoring"
        linkText="View Monitoring"
      />

      <FeatureCard
        title="Agents"
        description="Configure and monitor your trading agents."
        icon={<Bot className="h-6 w-6" />}
        link="/agents"
        linkText="Configure Agents"
      />

      <FeatureCard
        title="CLI Control"
        description="Access the command-line interface for advanced control."
        icon={<Terminal className="h-6 w-6" />}
        link="/cli"
        linkText="Open CLI"
      />

       <FeatureCard
        title="Settings"
        description="Adjust platform and user configurations."
        icon={<Settings className="h-6 w-6" />}
        link="/settings"
        linkText="Adjust Settings"
      />

       <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Automated Strategy Generation</CardTitle>
             <CardDescription>Let AI create and test new strategies for you.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground mb-4">
               Leverage the Strategy Coding Agent to automatically discover potentially profitable trading strategies based on your preferences and market analysis. The agent will code, debug, and backtest, notifying you only of successful results.
             </p>
            <Button asChild variant="outline">
              <Link href="/strategies#automated-generation">Configure Auto-Generation</Link>
            </Button>
          </CardContent>
       </Card>


    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  linkText: string;
}

function FeatureCard({ title, description, icon, link, linkText }: FeatureCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <div className="text-accent">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button asChild>
          <Link href={link}>{linkText}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
