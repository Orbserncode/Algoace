'use client'; // Add 'use client' for onClick handlers and toast

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, PlusCircle, Activity, Settings, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Mock agent data
const agents = [
  { id: 'agent-001', name: 'Strategy Generator', type: 'Strategy Coding Agent', status: 'Running', description: 'Automatically codes, debugs, and backtests new strategies.', tasksCompleted: 15, errors: 1 },
  { id: 'agent-002', name: 'Execution Agent - Momentum', type: 'Execution Agent', status: 'Running', description: 'Executes trades for the Momentum Burst strategy.', tasksCompleted: 128, errors: 0 },
  { id: 'agent-003', name: 'Market Scanner', type: 'Data Agent', status: 'Running', description: 'Monitors market data for potential signals.', tasksCompleted: 1532, errors: 3 },
  { id: 'agent-004', name: 'Execution Agent - AI Trend', type: 'Execution Agent', status: 'Idle', description: 'Executes trades for the AI Trend Follower strategy.', tasksCompleted: 95, errors: 0 },
   { id: 'agent-005', name: 'Risk Management Agent', type: 'Analysis Agent', status: 'Running', description: 'Monitors overall portfolio risk.', tasksCompleted: 45, errors: 0 },
];


export default function AgentsPage() {
    const { toast } = useToast(); // Initialize toast

    const handleAddAgent = () => {
        toast({ title: "Action Required", description: "Implement 'Add New Agent' functionality." });
    };

    const handleViewLogs = (agentId: string) => {
        toast({ title: "Action Required", description: `Implement log viewer for agent ${agentId}.` });
    };

    const handleConfigureAgent = (agentId: string) => {
        toast({ title: "Action Required", description: `Implement configuration for agent ${agentId}.` });
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
        case 'Running':
            return 'default'; // Primary color
        case 'Idle':
            return 'secondary';
        case 'Error':
            return 'destructive';
        default:
            return 'outline';
        }
    };

  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <div>
            <CardTitle>Manage Agents</CardTitle>
            <CardDescription>Configure and monitor your trading agents.</CardDescription>
          </div>
            <Button size="sm" onClick={handleAddAgent}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Agent
            </Button>
        </CardHeader>
         <CardContent>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {agents.map((agent) => (
                     <Card key={agent.id}>
                         <CardHeader>
                             <div className="flex items-center justify-between">
                                 <CardTitle className="text-lg flex items-center gap-2">
                                     {agent.type === 'Strategy Coding Agent' ? <FileCode className="h-5 w-5 text-accent" /> : <Bot className="h-5 w-5 text-accent" />}
                                     {agent.name}
                                 </CardTitle>
                                  <Badge variant={getStatusBadgeVariant(agent.status)}>{agent.status}</Badge>
                             </div>
                             <CardDescription>{agent.type}</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-3">
                              <p className="text-sm text-muted-foreground">{agent.description}</p>
                              <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Tasks Completed:</span>
                                  <span>{agent.tasksCompleted}</span>
                              </div>
                               <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Errors:</span>
                                   <span className={cn(agent.errors > 0 ? "text-destructive" : "")}>{agent.errors}</span>
                              </div>
                              <div className="flex space-x-2 pt-2">
                                 <Button variant="outline" size="sm" onClick={() => handleViewLogs(agent.id)}>
                                     <Activity className="mr-1 h-3 w-3" /> Logs
                                 </Button>
                                 <Button variant="outline" size="sm" onClick={() => handleConfigureAgent(agent.id)}>
                                     <Settings className="mr-1 h-3 w-3" /> Configure
                                 </Button>
                              </div>
                         </CardContent>
                     </Card>
                 ))}
             </div>
         </CardContent>
      </Card>
    </div>
  );
}
