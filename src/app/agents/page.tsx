'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, PlusCircle, Activity, Settings, FileCode, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { getAgents, Agent } from '@/services/agents-service'; // Import the service

export default function AgentsPage() {
    const { toast } = useToast();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadAgents() {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedAgents = await getAgents();
                setAgents(fetchedAgents);
            } catch (err) {
                console.error("Failed to fetch agents:", err);
                setError("Failed to load agent data. Please try again later.");
                toast({
                    title: "Error",
                    description: "Could not fetch agent list.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        }
        loadAgents();
     }, [toast]); // Added toast dependency


    const handleAddAgent = () => {
        // TODO: Implement logic to show a form/modal for adding a new agent
        toast({ title: "Feature Not Implemented", description: "Functionality to add a new agent is not yet available." });
    };

    const handleViewLogs = (agentId: string) => {
        // TODO: Implement navigation or modal display for agent logs
        toast({ title: "Feature Not Implemented", description: `Log viewing for agent ${agentId} is not yet available.` });
    };

    const handleConfigureAgent = (agentId: string) => {
         // TODO: Implement navigation or modal display for agent configuration
        toast({ title: "Feature Not Implemented", description: `Configuration for agent ${agentId} is not yet available.` });
    };

    const getStatusBadgeVariant = (status: Agent['status']) => {
        switch (status) {
        case 'Running':
            return 'default'; // Primary color
        case 'Idle':
            return 'secondary';
        case 'Error':
            return 'destructive';
         case 'Stopped': // Handle new status
             return 'outline';
        default:
            return 'outline';
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading agents...</span>
                 </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center py-10 text-destructive">
                     <AlertTriangle className="h-8 w-8 mb-2" />
                    <p>{error}</p>
                     <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Retry</Button>
                 </div>
            );
        }

        if (agents.length === 0) {
             return <p className="text-center text-muted-foreground py-10">No agents found.</p>;
        }

        return (
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
         );
    };


  return (
    <div className="space-y-6">
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <div>
            <CardTitle>Manage Agents</CardTitle>
            <CardDescription>Configure and monitor your trading agents.</CardDescription>
          </div>
            <Button size="sm" onClick={handleAddAgent} disabled={isLoading}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Agent
            </Button>
        </CardHeader>
         <CardContent>
             {renderContent()}
         </CardContent>
      </Card>
    </div>
  );
}