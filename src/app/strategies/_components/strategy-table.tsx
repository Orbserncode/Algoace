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
import { Play, Pause, Edit, Trash2, Loader2 } from "lucide-react";
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

interface StrategyTableProps {
  strategies: Strategy[];
  onStrategyUpdate: (updatedStrategy: Strategy) => void; // Callback for successful updates
  onStrategyDelete: (strategyId: string) => void; // Callback for successful deletion
}

export function StrategyTable({ strategies, onStrategyUpdate, onStrategyDelete }: StrategyTableProps) {
  const { toast } = useToast();
  // Track loading state per action and strategy ID (e.g., "toggle:strat-001", "delete:strat-002")
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleToggleStatus = async (strategy: Strategy) => {
    const action = strategy.status === 'Active' ? 'Pause' : 'Start';
    const newStatus = strategy.status === 'Active' ? 'Inactive' : 'Active';
    const actionId = `toggle:${strategy.id}`;

    setLoadingAction(actionId); // Set loading state for this specific action

    try {
      // Call the update service function
      const updated = await updateStrategy(strategy.id, { status: newStatus });

      if (updated) {
        toast({
          title: `Strategy ${action}d`,
          description: `Strategy "${updated.name}" is now ${updated.status}.`,
        });
        onStrategyUpdate(updated); // Notify parent component of the update
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
       setLoadingAction(null); // Clear loading state
    }
  };

  const handleEdit = (strategyId: string) => {
     // TODO: Implement edit logic (e.g., navigate to an edit page or open a modal)
    toast({ title: "Feature Not Implemented", description: `Editing strategy ${strategyId} is not yet available.` });
  };

  const handleDeleteConfirm = async (strategy: Strategy) => {
    const actionId = `delete:${strategy.id}`;
    setLoadingAction(actionId); // Set loading state for delete action

     try {
        const deleted = await deleteStrategy(strategy.id);
        if (deleted) {
            toast({
                title: "Strategy Deleted",
                description: `Strategy "${strategy.name}" has been permanently deleted.`,
            });
            onStrategyDelete(strategy.id); // Notify parent component
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
         setLoadingAction(null); // Clear loading state
     }
  };


  const getStatusBadgeVariant = (status: Strategy['status']) => {
    switch (status) {
      case 'Active':
        return 'default'; // Using primary color (often green-ish or blue-ish)
      case 'Inactive':
        return 'secondary'; // Gray
      case 'Debugging':
      case 'Backtesting':
        return 'outline'; // Outline with foreground text color
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
     if (typeof amount !== 'number') return '-'; // Handle undefined or non-numeric
     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

   const formatPercentage = (value: number | undefined) => {
    if (typeof value !== 'number') return '-';
    return `${value.toFixed(1)}%`;
  }


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right hidden sm:table-cell">P&L (USD)</TableHead>
          <TableHead className="text-right hidden lg:table-cell">Win Rate</TableHead>
          <TableHead className="text-right w-[160px]">Actions</TableHead> {/* Slightly wider for loading icon */}
        </TableRow>
      </TableHeader>
      <TableBody>
         {strategies.length === 0 && (
            <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No strategies found. Use the "Automated Strategy Generation" section or "Add New Strategy" button.
                </TableCell>
            </TableRow>
         )}
        {strategies.map((strategy) => {
            const isToggling = loadingAction === `toggle:${strategy.id}`;
            const isDeleting = loadingAction === `delete:${strategy.id}`;
            const isAnyLoading = isToggling || isDeleting;

            return (
              <TableRow key={strategy.id} className={cn(isAnyLoading && "opacity-60")}>
                <TableCell className="font-medium">{strategy.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate" title={strategy.description}>
                    {strategy.description}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(strategy.status)}>{strategy.status}</Badge>
                </TableCell>
                 <TableCell className={cn(
                     "text-right hidden sm:table-cell tabular-nums", // Use tabular-nums for alignment
                     typeof strategy.pnl === 'number' && (strategy.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                 )}>
                    {formatCurrency(strategy.pnl)}
                 </TableCell>
                 <TableCell className="text-right hidden lg:table-cell tabular-nums">
                     {formatPercentage(strategy.winRate)}
                 </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1 items-center">
                     {/* Show loader specific to action */}
                     {isToggling && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />}
                     {isDeleting && <Loader2 className="h-4 w-4 animate-spin text-destructive mr-1" />}

                     {/* Action Buttons */}
                     {!isAnyLoading && (
                         <>
                             {(strategy.status === 'Active' || strategy.status === 'Inactive') && (
                                 <Button variant="ghost" size="icon" aria-label={strategy.status === 'Active' ? "Pause Strategy" : "Start Strategy"} onClick={() => handleToggleStatus(strategy)} disabled={isAnyLoading}>
                                     {strategy.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                 </Button>
                             )}
                            <Button variant="ghost" size="icon" aria-label="Edit Strategy" onClick={() => handleEdit(strategy.id)} disabled={isAnyLoading}>
                              <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete Strategy" disabled={isAnyLoading}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the strategy
                                        "{strategy.name}".
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteConfirm(strategy)} className={buttonVariants({ variant: "destructive" })} disabled={isDeleting}>
                                        {/* Delete action does not need internal spinner, handled above */}
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
  );
}
