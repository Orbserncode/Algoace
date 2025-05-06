// src/app/strategies/_components/strategy-code-editor-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Strategy } from '@/services/strategies-service';
import { getStrategyCode, saveStrategyCode } from '@/services/strategies-service';

interface StrategyCodeEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  strategy: Strategy | null;
}

export function StrategyCodeEditorDialog({ isOpen, onOpenChange, strategy }: StrategyCodeEditorDialogProps) {
  const { toast } = useToast();
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCode() {
      if (isOpen && strategy) {
        setIsLoading(true);
        setError(null);
        try {
          const fetchedCode = await getStrategyCode(strategy.id);
          if (fetchedCode) {
            setCode(fetchedCode);
          } else {
            setCode(`# No code available for strategy: ${strategy.name}\n# Source: ${strategy.source || 'Unknown'}\n# This may be an AI-generated strategy without explicit code storage or an error.`);
            if (strategy.source !== 'Uploaded' && strategy.source !== 'AI-Generated') {
                 console.warn(`No specific code file expected for strategy source: ${strategy.source}`);
            }
          }
        } catch (err) {
          console.error(`Error fetching code for ${strategy.name}:`, err);
          setError(`Failed to load strategy code. ${err instanceof Error ? err.message : 'Please try again.'}`);
          setCode(`# Error loading code for strategy: ${strategy.name}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Clear state when dialog is closed or no strategy
        setCode('');
        setError(null);
        setIsLoading(false);
      }
    }
    fetchCode();
  }, [isOpen, strategy]);

  const handleSaveCode = async () => {
    if (!strategy) return;
    setIsSaving(true);
    setError(null);
    try {
      const success = await saveStrategyCode(strategy.id, code);
      if (success) {
        toast({
          title: "Code Saved",
          description: `Code for strategy "${strategy.name}" has been updated.`,
        });
        onOpenChange(false); // Close dialog on successful save
      } else {
        throw new Error("Backend failed to save the code.");
      }
    } catch (err) {
      console.error(`Error saving code for ${strategy.name}:`, err);
      setError(`Failed to save code. ${err instanceof Error ? err.message : 'Please try again.'}`);
      toast({
        title: "Error Saving Code",
        description: `Could not save code for "${strategy.name}".`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[80vw] lg:max-w-[70vw] xl:max-w-[60vw] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Strategy Code: {strategy?.name || 'N/A'}</DialogTitle>
          <DialogDescription>
            Modify the Python code for the strategy "{strategy?.name || 'N/A'}".
            Changes will be saved to the backend. Ensure code follows the Lumibot framework.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2">Loading code...</span>
          </div>
        )}

        {!isLoading && (
          <ScrollArea className="flex-1 border rounded-md bg-muted/20 my-4">
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="# Enter your Lumibot strategy code here..."
              className="min-h-[60vh] font-mono text-xs p-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              disabled={isSaving}
            />
          </ScrollArea>
        )}

        {error && !isLoading && (
          <div className="mt-2 p-2 text-sm text-destructive bg-destructive/10 rounded-md flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
            {error}
          </div>
        )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSaveCode}
            disabled={isSaving || isLoading || !strategy || !!error}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
