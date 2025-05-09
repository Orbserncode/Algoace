// src/app/agents/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Bot, PlusCircle, Activity, Settings, FileCode, Loader2, AlertTriangle, Power, PowerOff, Trash2, Play, Pause } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getAgents, activateAgent, deactivateAgent, deleteAgent, Agent } from '@/services/agents-service.new'; // Import Pydantic-AI services
import { AgentConfigurationDialog } from './_components/agent-configuration-dialog.new'; // Import the new Pydantic-AI dialog component
import type { AgentConfig } from '@/services/agents-service.new'; // Import Pydantic-AI config types

export default function AgentsPage() {
    const { toast } = useToast();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null); // Track loading state for specific actions (e.g., "toggle:agent-id")
    
    // Helper function to check if an action is loading
    const isActionInProgress = (actionId?: string): boolean => {
        return actionLoading !== null && (actionId ? actionLoading === actionId : true);
    };
    const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
    const [selectedAgentForConfig, setSelectedAgentForConfig] = useState<Agent | null>(null);

    const loadAgents = useCallback(async () => {
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
    }, [toast]); // Added toast dependency

    useEffect(() => {
        loadAgents();
     }, [loadAgents]);


    const handleAddAgent = () => {
        // TODO: Implement logic to show a form/modal for adding a new agent
        // This might involve selecting agent type, linking to strategy, etc.
        toast({ title: "Feature Not Implemented", description: "Functionality to add a new custom agent is not yet available." });
    };

    const handleViewLogs = (agentId: string) => {
        // TODO: Implement navigation or modal display for agent logs
        toast({ title: "Feature Not Implemented", description: `Log viewing for agent ${agentId} is not yet available.` });
    };

    const handleConfigureAgent = (agent: Agent) => {
        setSelectedAgentForConfig(agent);
        setIsConfigDialogOpen(true);
    };

     // Callback after config is saved in the dialog
    const handleConfigSaved = (updatedAgent: Agent) => {
        setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        setIsConfigDialogOpen(false); // Close the dialog
         toast({ title: "Configuration Saved", description: `Settings for ${updatedAgent.name} updated.`});
    };


    const handleToggleAgentStatus = async (agent: Agent) => {
        const actionId = `toggle:${agent.id}`;
        setActionLoading(actionId);
        const isActivating = agent.status === 'Idle';
        const actionVerb = isActivating ? 'Activating' : 'Deactivating';

        try {
            const updatedAgent = isActivating
                ? await activateAgent(agent.id)
                : await deactivateAgent(agent.id);
            if (updatedAgent) {
                setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
                toast({ title: `Agent ${isActivating ? 'Activated' : 'Deactivated'}`, description: `${updatedAgent.name} is now ${updatedAgent.status}.` });
            } else {
                 throw new Error("Agent not found or update failed.");
            }
        } catch (err) {
            console.error(`${actionVerb} agent error:`, err);
            toast({ title: `Error ${actionVerb} Agent`, description: `Could not update status for ${agent.name}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };

     const handleDeleteAgent = async (agentId: string) => {
         const actionId = `delete:${agentId}`;
         setActionLoading(actionId);
        try {
            const success = await deleteAgent(agentId);
            if (success) {
                 setAgents(prev => prev.filter(a => a.id !== agentId));
                 toast({ title: "Agent Deleted", description: `Agent ${agentId} has been removed.` });
            } else {
                // This case might happen if trying to delete a default agent or agent not found
                toast({ title: "Deletion Failed", description: `Agent ${agentId} could not be deleted (it might be a default agent or not found).`, variant: "destructive" });
            }
        } catch (err) {
             console.error(`Delete agent error:`, err);
             toast({ title: "Error Deleting Agent", description: `Could not delete agent ${agentId}. ${err instanceof Error ? err.message : ''}`, variant: "destructive" });
        } finally {
            setActionLoading(null);
        }
    };


    const getStatusBadgeVariant = (status: Agent['status']) => {
        switch (status) {
        case 'Active':
            return 'default'; // Primary color
        case 'Idle':
            return 'secondary';
        case 'Error':
            return 'destructive';
        default:
            return 'outline';
        }
    };

     const getAgentIcon = (type: Agent['type']) => {
        switch (type) {
            case 'Strategy Coding Agent': return <FileCode className="h-5 w-5 text-accent" />;
            case 'Execution Agent': return <Play className="h-5 w-5 text-green-500" />; // Changed icon
            case 'Data Agent': return <Activity className="h-5 w-5 text-blue-500" />; // Changed icon
            case 'Analysis Agent': return <Bot className="h-5 w-5 text-purple-500" />; // Changed icon
            default: return <Bot className="h-5 w-5 text-accent" />;
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
                     <Button onClick={loadAgents} variant="outline" className="mt-4">Retry</Button>
                 </div>
            );
        }

        if (agents.length === 0) {
             return <p className="text-center text-muted-foreground py-10">No agents found.</p>;
        }

        return (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {agents.map((agent) => {
                     const isActionForThisAgent = actionLoading && actionLoading.endsWith(agent.id);
                     const isToggling = actionLoading === `toggle:${agent.id}`;
                     const isDeleting = actionLoading === `delete:${agent.id}`;
                     const isConfiguring = actionLoading === `config:${agent.id}`;

                     return (
                         <Card key={agent.id} className={cn(isActionForThisAgent && "opacity-70 pointer-events-none")}>
                             <CardHeader>
                                 <div className="flex items-center justify-between">
                                     <CardTitle className="text-lg flex items-center gap-2">
                                         {getAgentIcon(agent.type)}
                                         {agent.name}
                                         {agent.isDefault && <Badge variant="outline" className="text-xs font-normal">Default</Badge>}
                                     </CardTitle>
                                      <Badge variant={getStatusBadgeVariant(agent.status)}>{agent.status}</Badge>
                                 </div>
                                 <CardDescription>{agent.type}</CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-3">
                                  <p className="text-sm text-muted-foreground min-h-[40px]">{agent.description}</p>
                                   {agent.associatedStrategyIds && agent.associatedStrategyIds.length > 0 && (
                                      <div className="text-xs text-muted-foreground">
                                          Strategies: {agent.associatedStrategyIds.join(', ')}
                                      </div>
                                  )}
                                  <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Tasks Completed:</span>
                                      <span>{agent.tasksCompleted}</span>
                                  </div>
                                   <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Errors:</span>
                                       <span className={cn(agent.errors > 0 ? "text-destructive" : "")}>{agent.errors}</span>
                                  </div>
                                  <div className="flex space-x-2 pt-2">
                                     {/* Activate/Deactivate Button */}
                                     <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleAgentStatus(agent)}
                                        disabled={!!isActionForThisAgent}
                                        title={agent.status === 'Idle' ? 'Activate Agent' : 'Deactivate Agent'}
                                     >
                                        {isToggling ? (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                         ) : agent.status === 'Idle' ? (
                                            <Power className="mr-1 h-3 w-3 text-green-500" />
                                        ) : (
                                            <PowerOff className="mr-1 h-3 w-3 text-red-500" />
                                        )}
                                         {agent.status === 'Idle' ? 'Activate' : 'Deactivate'}
                                    </Button>
                                     <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleConfigureAgent(agent)}
                                        disabled={!!isActionForThisAgent || agent.status === 'Active'}
                                        title={agent.status === 'Active' ? 'Deactivate agent first to configure' : 'Configure agent settings'}
                                     >
                                         <Settings className="mr-1 h-3 w-3" /> Configure
                                     </Button>
                                     <Button variant="outline" size="sm" onClick={() => handleViewLogs(agent.id)} disabled={!!isActionForThisAgent}>
                                         <Activity className="mr-1 h-3 w-3" /> Logs
                                     </Button>
                                     {/* Delete Button (only for non-default) */}
                                     {!agent.isDefault && (
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={!!isActionForThisAgent}>
                                                     {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                 </Button>
                                            </AlertDialogTrigger>
                                             <AlertDialogContent>
                                                 <AlertDialogHeader>
                                                     <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
                                                     <AlertDialogDescription>
                                                         Are you sure you want to permanently delete the agent "{agent.name}"? This action cannot be undone.
                                                     </AlertDialogDescription>
                                                 </AlertDialogHeader>
                                                 <AlertDialogFooter>
                                                     <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                     <AlertDialogAction onClick={() => handleDeleteAgent(agent.id)} className={buttonVariants({ variant: "destructive" })}>
                                                         Delete Agent
                                                     </AlertDialogAction>
                                                 </AlertDialogFooter>
                                             </AlertDialogContent>
                                         </AlertDialog>
                                     )}
                                  </div>
                             </CardContent>
                         </Card>
                     );
                  })}
             </div>
         );
    };


  return (
      <>
        <div className="space-y-6">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <div>
                <CardTitle>Manage Agents</CardTitle>
                <CardDescription>Configure, monitor, activate, and deactivate your trading agents.</CardDescription>
              </div>
                <Button size="sm" onClick={handleAddAgent} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Agent
                </Button>
            </CardHeader>
             <CardContent>
                 {renderContent()}
             </CardContent>
          </Card>
        </div>

        {/* Configuration Dialog */}
         {selectedAgentForConfig && (
            <AgentConfigurationDialog
                isOpen={isConfigDialogOpen}
                onOpenChange={setIsConfigDialogOpen}
                agent={selectedAgentForConfig}
                onConfigSaved={handleConfigSaved}
            />
        )}
     </>
  );
}
