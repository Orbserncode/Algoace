// src/app/strategies/_components/strategy-table.tsx
'use client';

import React, { useState } from 'react'; // Import useState
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
import { Play, Pause, Edit, Trash2, Loader2, BrainCircuit, FileCode } from "lucide-react"; // Removed History icon
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
import type { Strategy } from '@/services/strategies-service'; // Import type
import { updateStrategy, deleteStrategy } from '@/services/strategies-service'; // Import service functions
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
// Removed BacktestResultDialog import

interface StrategyTableProps {
  strategies: Strategy[];
  onStrategyUpdate: (updatedStrategy: Strategy) => void; // Callback for successful updates
  onStrategyDelete: (strategyId: string) => void; // Callback for successful deletion
}

export function StrategyTable({ strategies, onStrategyUpdate, onStrategyDelete }: StrategyTableProps) {
  const { toast } = useToast();
  // Track loading state per action and strategy ID (e.g., "toggle:strat-001", "delete:strat-002")
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  // Removed backtest dialog state

  const handleToggleStatus = async (strategy: Strategy) => {
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

  const handleEdit = (strategyId: string) => {
    toast({ title: "Feature Not Implemented", description: `Editing strategy ${strategyId} is not yet available.` });
  };

   // Removed handleBacktest function

  const handleDeleteConfirm = async (strategy: Strategy) => {
    const actionId = `delete:${strategy.id}`;
    setLoadingAction(actionId);

     try {
        const deleted = await deleteStrategy(strategy.id);
        if (deleted) {
            toast({
                title: "Strategy Deleted",
                description: `Strategy "${strategy.name}" has been permanently deleted.`,
            });
            onStrategyDelete(strategy.id);
        } else {
             throw new Error("Strategy not found or deletion failed.");
        }
     } catch (error) {
         console.error(`Failed to delete strategy ${strategy.id}:`, error);
         toast({
            title: "Error Deleting Strategy",
            description: `Could not delete strategy "${strategy.name}". ${error instanceof Error ? error.message : 'Please try again.'}`,
            variant: "destructive",
         });
     } finally {
         setLoadingAction(null);
     }
  };


  const getStatusBadgeVariant = (status: Strategy['status']) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Debugging':
      case 'Backtesting': // Keep this case for potential status updates
        return 'outline';
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
            <TableHead className="text-right w-[150px]">Actions</TableHead> {/* Adjusted width */}
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
              const isDeleting = loadingAction === `delete:${strategy.id}`;
              // Removed isBacktesting
              const isAnyLoading = isToggling || isDeleting;

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
                       {isDeleting && <Loader2 className="h-4 w-4 animate-spin text-destructive mr-1" />}
                       {/* Removed backtest loader */}

                       {!isAnyLoading && (
                           <>
                               {/* Start/Pause Button */}
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

                               {/* Removed Backtest Button */}

                               {/* Edit Button */}
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                       <Button variant="ghost" size="icon" aria-label="Edit Strategy" onClick={() => handleEdit(strategy.id)} disabled={isAnyLoading}>
                                        <Edit className="h-4 w-4" />
                                       </Button>
                                  </TooltipTrigger>
                                   <TooltipContent>
                                      <p>Edit Strategy (Not Implemented)</p>
                                   </TooltipContent>
                              </Tooltip>

                               {/* Delete Button */}
                               <AlertDialog>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                         <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete Strategy" disabled={isAnyLoading}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                       <TooltipContent>
                                          <p>Delete Strategy</p>
                                       </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          This action cannot be undone. This will permanently delete the strategy
                                          "{strategy.name}".
                                          {strategy.fileName && ` (File: ${strategy.fileName})`}
                                      </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteConfirm(strategy)} className={buttonVariants({ variant: "destructive" })} disabled={isDeleting}>
                                          Delete
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

    {/* Removed Backtest Result Dialog rendering */}
    </>
  );
}
