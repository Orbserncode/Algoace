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
  const [updatingStrategies, setUpdatingStrategies] = useState<Set<string>>(new Set()); // Track loading state per strategy

  const handleToggleStatus = async (strategy: Strategy) => {
    const action = strategy.status === 'Active' ? 'Pause' : 'Start';
    const newStatus = strategy.status === 'Active' ? 'Inactive' : 'Active';
    const strategyId = strategy.id;

    setUpdatingStrategies(prev => new Set(prev).add(strategyId)); // Add to loading set

    try {
      // Call the update service function
      const updated = await updateStrategy(strategyId, { status: newStatus });

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
      console.error(`Failed to ${action} strategy ${strategyId}:`, error);
      toast({
        title: `Error ${action}ing Strategy`,
        description: `Could not ${action.toLowerCase()} strategy "${strategy.name}". Please try again.`,
        variant: "destructive",
      });
    } finally {
       setUpdatingStrategies(prev => { // Remove from loading set
            const next = new Set(prev);
            next.delete(strategyId);
            return next;
       });
    }
  };

  const handleEdit = (strategyId: string) => {
     // TODO: Implement edit logic (e.g., navigate to an edit page or open a modal)
    toast({ title: "Feature Not Implemented", description: `Editing strategy ${strategyId} is not yet available.` });
  };

  const handleDeleteConfirm = async (strategy: Strategy) => {
    const strategyId = strategy.id;
    setUpdatingStrategies(prev => new Set(prev).add(strategyId)); // Add to loading set

     try {
        const deleted = await deleteStrategy(strategyId);
        if (deleted) {
            toast({
                title: "Strategy Deleted",
                description: `Strategy "${strategy.name}" has been permanently deleted.`,
            });
            onStrategyDelete(strategyId); // Notify parent component
        } else {
             throw new Error("Strategy not found or deletion failed.");
        }
     } catch (error) {
         console.error(`Failed to delete strategy ${strategyId}:`, error);
         toast({
            title: "Error Deleting Strategy",
            description: `Could not delete strategy "${strategy.name}". Please try again.`,
            variant: "destructive",
         });
     } finally {
         setUpdatingStrategies(prev => { // Remove from loading set
            const next = new Set(prev);
            next.delete(strategyId);
            return next;
         });
     }
  };


  const getStatusBadgeVariant = (status: Strategy['status']) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Debugging':
      case 'Backtesting':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
     return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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
          <TableHead className="text-right w-[150px]">Actions</TableHead> {/* Fixed width for actions */}
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
            const isLoading = updatingStrategies.has(strategy.id);
            return (
              <TableRow key={strategy.id} className={cn(isLoading && "opacity-50 pointer-events-none")}>
                <TableCell className="font-medium">{strategy.name}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{strategy.description}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(strategy.status)}>{strategy.status}</Badge>
                </TableCell>
                 <TableCell className={cn(
                     "text-right hidden sm:table-cell tabular-nums", // Use tabular-nums for alignment
                     strategy.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                 )}>
                    {formatCurrency(strategy.pnl)}
                 </TableCell>
                 <TableCell className="text-right hidden lg:table-cell tabular-nums">{strategy.winRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                     {isLoading ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                         <>
                             {(strategy.status === 'Active' || strategy.status === 'Inactive') && (
                                 <Button variant="ghost" size="icon" aria-label={strategy.status === 'Active' ? "Pause Strategy" : "Start Strategy"} onClick={() => handleToggleStatus(strategy)} disabled={isLoading}>
                                     {strategy.status === 'Active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                 </Button>
                             )}
                            <Button variant="ghost" size="icon" aria-label="Edit Strategy" onClick={() => handleEdit(strategy.id)} disabled={isLoading}>
                              <Edit className="h-4 w-4" />
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete Strategy" disabled={isLoading}>
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
                                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteConfirm(strategy)} className={buttonVariants({ variant: "destructive" })} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
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