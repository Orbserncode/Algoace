// src/app/strategies/_components/add-strategy-dialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AddStrategyForm } from "./add-strategy-form";
import type { Strategy } from '@/services/strategies-service';

interface AddStrategyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onStrategyAdded: (newStrategy: Strategy) => void;
}

export function AddStrategyDialog({ isOpen, onOpenChange, onStrategyAdded }: AddStrategyDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Strategy</DialogTitle>
          <DialogDescription>
            Fill in the details below or upload a Python file (.py) following the Lumibot framework.
            Note: Backend file storage and validation are required for uploaded files to function fully.
          </DialogDescription>
        </DialogHeader>
        <AddStrategyForm onStrategyAdded={onStrategyAdded} />
      </DialogContent>
    </Dialog>
  );
}
