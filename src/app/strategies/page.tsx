// src/app/strategies/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { StrategyTable } from './_components/strategy-table';
import { AutomatedGenerationForm } from './_components/automated-generation-form';
import { AddStrategyDialog } from './_components/add-strategy-dialog'; // Import the new dialog
import { useToast } from "@/hooks/use-toast";
import { getStrategies, Strategy } from '@/services/strategies-service';

export default function StrategiesPage() {
    const { toast } = useToast();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false); // State for dialog

    const loadStrategies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedStrategies = await getStrategies();
            setStrategies(fetchedStrategies);
        } catch (err) {
            console.error("Failed to fetch strategies:", err);
            setError("Failed to load strategies. Please try again later.");
            toast({
                title: "Error Loading Strategies",
                description: err instanceof Error ? err.message : "Could not fetch strategy list.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]); // Add toast, no need for strategies here as it causes loop

    useEffect(() => {
        loadStrategies();
    }, [loadStrategies]); // Depend on the memoized loadStrategies

    const handleAddNewStrategy = () => {
        setIsAddDialogOpen(true); // Open the dialog
    };

     // Callback for when a strategy is updated in the table
    const handleStrategyUpdate = useCallback((updatedStrategy: Strategy) => {
        setStrategies(prevStrategies =>
            prevStrategies.map(s => s.id === updatedStrategy.id ? updatedStrategy : s)
        );
    }, []); // Empty dependency array as setStrategies is stable

     // Callback for when a strategy is deleted from the table
    const handleStrategyDelete = useCallback((deletedStrategyId: string) => {
        setStrategies(prevStrategies =>
            prevStrategies.filter(s => s.id !== deletedStrategyId)
        );
    }, []); // Empty dependency array as setStrategies is stable

     // Callback for when a new strategy is generated or added
    const handleStrategyAdded = useCallback((newStrategy: Strategy) => {
        setStrategies(prevStrategies => [...prevStrategies, newStrategy]);
        setIsAddDialogOpen(false); // Close dialog on success
         toast({
            title: "Strategy Added",
            description: `New strategy "${newStrategy.name}" added to the list.`,
         });
    }, [toast]);


    const renderStrategyTable = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading strategies...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-40 text-destructive">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p>{error}</p>
                    <Button onClick={loadStrategies} variant="outline" className="mt-4">Retry</Button>
                </div>
            );
        }

        return (
            <StrategyTable
                strategies={strategies}
                onStrategyUpdate={handleStrategyUpdate}
                onStrategyDelete={handleStrategyDelete}
             />
        );
    };

  return (
    <>
      <div className="space-y-6">
        {/* Strategy List Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Manage Strategies</CardTitle>
              <CardDescription>View, manage, and add trading strategies.</CardDescription>
            </div>
            <Button size="sm" onClick={handleAddNewStrategy} disabled={isLoading}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Strategy
            </Button>
          </CardHeader>
          <CardContent>
            {renderStrategyTable()}
          </CardContent>
        </Card>

        {/* Automated Generation Card */}
        <Card id="automated-generation">
          <CardHeader>
            <CardTitle>Automated Strategy Generation</CardTitle>
            <CardDescription>Configure the AI agent to suggest, generate, and test new strategies.</CardDescription>
          </CardHeader>
          <CardContent>
             <AutomatedGenerationForm onStrategyGenerated={handleStrategyAdded} /> {/* Use common handler */}
          </CardContent>
        </Card>
      </div>

      {/* Add Strategy Dialog */}
      <AddStrategyDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onStrategyAdded={handleStrategyAdded} // Pass the callback
      />
    </>
  );
}
