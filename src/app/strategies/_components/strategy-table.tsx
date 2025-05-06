// src/app/strategies/_components/strategy-table.tsx
'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Play, Pause, Edit, Trash2, Loader2, BrainCircuit, FileCode, Archive, Eye } from "lucide-react"; // Added Archive, Eye icons
import { cn } from "@/lib/utils";
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
import type { Strategy } from '@/services/strategies-service';
import { updateStrategy, archiveStrategy, deleteStrategyPermanently } from '@/services/strategies-service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StrategyCodeEditorDialog } from './strategy-code-editor-dialog'; // Import the new editor dialog

interface StrategyTableProps {
  strategies: Strategy[];
  onStrategyUpdate: (updatedStrategy: Strategy) => void; // Callback for successful updates/archive
  onStrategyDelete: (strategyId: string) => void; // Callback for successful permanent deletion
}

export function StrategyTable({ strategies, onStrategyUpdate, onStrategyDelete }: StrategyTableProps) {
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // Format: "action:strategyId"
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedStrategyForEditor, setSelectedStrategyForEditor] = useState<Strategy | null>(null);


  const handleToggleStatus = async (strategy: Strategy) => {
    // Don't allow toggling for Archived strategies
    if (strategy.status === 'Archived') return;

    const action = strategy.status === 'Active' ? 'Pause' : 'Start';
    const newStatus = strategy.status === 'Active' ? 'Inactive' : 'Active';
    const actionId = `toggle:${strategy.id}`;

    setLoadingAction(actionId);

    try {
      const updated = await updateStrategy(strategy.id, { status: newStatus });
      if (updated) {
        toast({
          title: `Strategy ${action}d`,
          description: `Strategy "${updated.name}" is now ${updated.status}.`,
        });
        onStrategyUpdate(updated);
      } else {
         throw new Error("Strategy not found or update failed.");
      }
    } catch (error) {
      console.error(`Failed to ${action} strategy ${strategy.id}:`, error);
      toast({
        title: `Error ${action}ing Strategy`,
        description: `Could not ${action.toLowerCase()} strategy "${strategy.name}". ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
       setLoadingAction(null);
    }
  };

   const handleOpenEditor = (strategy: Strategy) => {
     setSelectedStrategyForEditor(strategy);
     setIsEditorOpen(true);
   };


  const handleArchiveAction = async (strategy: Strategy) => {
     const actionId = `archive:${strategy.id}`;
     setLoadingAction(actionId);

     try {
        const archived = await archiveStrategy(strategy.id);
        if (archived) {
            toast({
                title: "Strategy Archived",
                description: `Strategy "${archived.name}" has been archived. It will be hidden from the main list.`,
            });
            onStrategyUpdate(archived); // Use update callback to filter/re-render list
        } else {
             throw new Error("Strategy not found or archiving failed.");
        }
     } catch (error) {
         console.error(`Failed to archive strategy ${strategy.id}:`, error);
         toast({
            title: "Error Archiving Strategy",
            description: `Could not archive strategy "${strategy.name}". ${error instanceof Error ? error.message : 'Please try again.'}`,
            variant: "destructive",
         });
     } finally {
         setLoadingAction(null);
     }
  };


  const handleDeleteConfirm = async (strategy: Strategy) => {
    const actionId = `delete:${strategy.id}`;
    setLoadingAction(actionId);

     try {
        const deleted = await deleteStrategyPermanently(strategy.id);
        if (deleted) {
            toast({
                title: "Strategy Deleted Permanently",
                description: `Strategy "${strategy.name}" has been permanently deleted.`,
            });
            onStrategyDelete(strategy.id); // Use delete callback to remove from list
        } else {
             throw new Error("Strategy not found or deletion failed.");
        }
     } catch (error) {
         console.error(`Failed to delete strategy ${strategy.id}:`, error);
         toast({
            title: "Error Deleting Strategy",
            description: `Could not permanently delete strategy "${strategy.name}". ${error instanceof Error ? error.message : 'Please try again.'}`,
            variant: "destructive",
         });
     } finally {
         setLoadingAction(null);
     }
  };


  const getStatusBadgeVariant = (status: Strategy['status']) => {
    switch (status) {
      case 'Active':
        return 'default'; // Primary (Blue)
      case 'Inactive':
        return 'secondary'; // Gray
      case 'Debugging':
      case 'Backtesting':
        return 'outline'; // Outline
      case 'Archived':
        return 'destructive'; // Use destructive-like color for visibility
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
     if (typeof amount !== 'number') return '-';
     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

   const formatPercentage = (value: number | undefined) => {
    if (typeof value !== 'number') return '-';
    return `${value.toFixed(1)}%`;
  }


  return (
     <>
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="hidden lg:table-cell">Description</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Source</TableHead>
            <TableHead className="text-right hidden sm:table-cell w-[120px]">P&L (USD)</TableHead>
            <TableHead className="text-right hidden lg:table-cell w-[100px]">Win Rate</TableHead>
            <TableHead className="text-right w-[200px]">Actions</TableHead> {/* Adjusted width */}
          </TableRow>
        </TableHeader>
        <TableBody>
           {strategies.length === 0 && (
              <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No strategies found. Use the "Automated Strategy Generation" section or "Add New Strategy" button.
                  </TableCell>
              </TableRow>
           )}
          {strategies.map((strategy) => {
              const isToggling = loadingAction === `toggle:${strategy.id}`;
              const isArchiving = loadingAction === `archive:${strategy.id}`;
              const isDeleting = loadingAction === `delete:${strategy.id}`;
              const isAnyLoading = isToggling || isArchiving || isDeleting;

              return (
                <TableRow key={strategy.id} className={cn(isAnyLoading && "opacity-60")}>
                  <TableCell className="font-medium">{strategy.name}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate" title={strategy.description}>{strategy.description}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(strategy.status)}>{strategy.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                      {strategy.source && (
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    {strategy.source === 'AI-Generated' ? <BrainCircuit className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
                                  </span>
                              </TooltipTrigger>
                               <TooltipContent>
                                <p>{strategy.source}</p>
                                 {strategy.source === 'Uploaded' && strategy.fileName && (
                                     <p className="text-xs text-muted-foreground mt-1">{strategy.fileName}</p>
                                 )}
                               </TooltipContent>
                           </Tooltip>
                      )}
                    </TableCell>
                  <TableCell className={cn(
                       "text-right hidden sm:table-cell tabular-nums",
                       typeof strategy.pnl === 'number' && (strategy.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                   )}>{formatCurrency(strategy.pnl)}</TableCell>
                  <TableCell className="text-right hidden lg:table-cell tabular-nums">{formatPercentage(strategy.winRate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1 items-center">
                       {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />}
                       {isArchiving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />}
                       {isDeleting && <Loader2 className="h-4 w-4 animate-spin text-destructive mr-1" />}
                       

                       {!isAnyLoading && (
                           <>
                               {/* Start/Pause Button - Only if not Archived */}
                               {(strategy.status === 'Active' || strategy.status === 'Inactive') && (
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" aria-label={strategy.status === 'Active' ? "Pause Strategy" : "Start Strategy"} onClick={() => handleToggleStatus(strategy)} disabled={isAnyLoading}>
                                              {strategy.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                          </Button>
                                       </TooltipTrigger>
                                       <TooltipContent>
                                          <p>{strategy.status === 'Active' ? "Pause Strategy" : "Start Strategy"}</p>
                                       </TooltipContent>
                                  </Tooltip>
                               )}

                               {/* Edit/View Code Button */}
                               <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" aria-label="Edit Strategy Code" onClick={() => handleOpenEditor(strategy)} disabled={isAnyLoading}>
                                          <Edit className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                      <p>Edit/View Strategy Code</p>
                                  </TooltipContent>
                               </Tooltip>

                               {/* Archive/Delete Button */}
                               <AlertDialog>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                         <AlertDialogTrigger asChild>
                                            {/* Show Archive icon if not archived, Trash if archived */}
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={strategy.status === 'Archived' ? "Delete Permanently" : "Archive Strategy"} disabled={isAnyLoading}>
                                                 {strategy.status === 'Archived' ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                            </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                       <TooltipContent>
                                          <p>{strategy.status === 'Archived' ? "Delete Permanently" : "Archive or Delete"}</p>
                                       </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          {strategy.status === 'Archived'
                                            ? `This action cannot be undone. This will permanently delete the archived strategy "${strategy.name}".`
                                            : `Choose an action for strategy "${strategy.name}". Archiving will hide it from the main list but keep its data. Deleting is permanent.`}
                                           {strategy.fileName && ` (File: ${strategy.fileName})`}
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel disabled={isDeleting || isArchiving}>Cancel</AlertDialogCancel>
                                          {/* Show Archive button only if not already archived */}
                                          {strategy.status !== 'Archived' && (
                                              <Button
                                                  variant="outline"
                                                  onClick={() => handleArchiveAction(strategy)}
                                                  disabled={isDeleting || isArchiving}
                                                >
                                                  {isArchiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                  Archive
                                              </Button>
                                          )}
                                          <AlertDialogAction
                                              onClick={() => handleDeleteConfirm(strategy)}
                                              className={buttonVariants({ variant: "destructive" })}
                                              disabled={isDeleting || isArchiving}
                                            >
                                               {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                               Delete Permanently
                                           </AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                            </>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
            )}
          )}
        </TableBody>
      </Table>
    </TooltipProvider>

     {/* Code Editor Dialog */}
     {selectedStrategyForEditor && (
        <StrategyCodeEditorDialog
            isOpen={isEditorOpen}
            onOpenChange={setIsEditorOpen}
            strategy={selectedStrategyForEditor}
        />
     )}
    </>
  );
}
