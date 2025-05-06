// src/app/strategies/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, AlertTriangle, Archive, EyeOff } from "lucide-react"; // Added Archive, EyeOff
import { StrategyTable } from './_components/strategy-table';
import { AutomatedGenerationForm } from './_components/automated-generation-form';
import { AddStrategyDialog } from './_components/add-strategy-dialog';
import { useToast } from "@/hooks/use-toast";
import { getStrategies, Strategy } from '@/services/strategies-service';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { Label } from '@/components/ui/label'; // Import Label

export default function StrategiesPage() {
    const { toast } = useToast();
    const [allStrategies, setAllStrategies] = useState<Strategy[]>([]); // Store all including archived
    const [filteredStrategies, setFilteredStrategies] = useState<Strategy[]>([]); // Displayed list
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const loadStrategies = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Always fetch all strategies now
            const fetchedStrategies = await getStrategies(true); // Pass true to include archived
            setAllStrategies(fetchedStrategies);
            // Apply filter based on current state
            setFilteredStrategies(
                showArchived
                    ? fetchedStrategies
                    : fetchedStrategies.filter(s => s.status !== 'Archived')
            );
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
    }, [toast, showArchived]); // Depend on showArchived

    useEffect(() => {
        loadStrategies();
    }, [loadStrategies]); // Load when component mounts or loadStrategies changes

    // Filter strategies whenever showArchived changes
    useEffect(() => {
         setFilteredStrategies(
            showArchived
                ? allStrategies
                : allStrategies.filter(s => s.status !== 'Archived')
         );
    }, [showArchived, allStrategies]);

    const handleAddNewStrategy = () => {
        setIsAddDialogOpen(true);
    };

    // Handles both updates and archiving (which is just a status update)
    const handleStrategyUpdate = useCallback((updatedStrategy: Strategy) => {
        setAllStrategies(prevStrategies =>
            prevStrategies.map(s => s.id === updatedStrategy.id ? updatedStrategy : s)
        );
         // Re-filtering will happen automatically due to the useEffect dependency on allStrategies
    }, []);

    const handleStrategyDelete = useCallback((deletedStrategyId: string) => {
        setAllStrategies(prevStrategies =>
            prevStrategies.filter(s => s.id !== deletedStrategyId)
        );
         // Re-filtering will happen automatically
    }, []);

    const handleStrategyAdded = useCallback((newStrategy: Strategy) => {
        // Add to the main list, filter will apply automatically
        setAllStrategies(prevStrategies => [newStrategy, ...prevStrategies]);
        setIsAddDialogOpen(false);
         toast({
            title: "Strategy Added",
            description: `New strategy "${newStrategy.name}" added.`,
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
                strategies={filteredStrategies} // Pass the filtered list
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
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
            <div>
              <CardTitle>Manage Strategies</CardTitle>
              <CardDescription>View, manage, add, and interact with trading strategies.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 mr-2">
                     <Checkbox
                         id="show-archived"
                         checked={showArchived}
                         onCheckedChange={(checked) => setShowArchived(Boolean(checked))}
                         disabled={isLoading}
                     />
                     <Label htmlFor="show-archived" className="text-sm text-muted-foreground flex items-center gap-1">
                        {showArchived ? <EyeOff className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        Show Archived
                     </Label>
                 </div>
                 <Button size="sm" onClick={handleAddNewStrategy} disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Strategy
                 </Button>
            </div>
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
             <AutomatedGenerationForm onStrategyGenerated={handleStrategyAdded} />
          </CardContent>
        </Card>
      </div>

      {/* Add Strategy Dialog */}
      <AddStrategyDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onStrategyAdded={handleStrategyAdded}
      />
    </>
  );
}
