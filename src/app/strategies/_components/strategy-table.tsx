'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting';
  pnl: number;
  winRate: number;
}

interface StrategyTableProps {
  strategies: Strategy[];
}

export function StrategyTable({ strategies }: StrategyTableProps) {

  const getStatusBadgeVariant = (status: Strategy['status']) => {
    switch (status) {
      case 'Active':
        return 'default'; // Use primary color (Deep Blue in theme)
      case 'Inactive':
        return 'secondary'; // Use secondary color (Gray in theme)
      case 'Debugging':
      case 'Backtesting':
        return 'outline'; // Use outline variant
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
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {strategies.map((strategy) => (
          <TableRow key={strategy.id}>
            <TableCell className="font-medium">{strategy.name}</TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{strategy.description}</TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(strategy.status)}>{strategy.status}</Badge>
            </TableCell>
             <TableCell className={cn(
                 "text-right hidden sm:table-cell",
                 strategy.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
             )}>
                {formatCurrency(strategy.pnl)}
             </TableCell>
             <TableCell className="text-right hidden lg:table-cell">{strategy.winRate.toFixed(1)}%</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end space-x-1">
                 {strategy.status === 'Active' ? (
                     <Button variant="ghost" size="icon" aria-label="Pause Strategy">
                         <Pause className="h-4 w-4" />
                     </Button>
                 ) : (
                      <Button variant="ghost" size="icon" aria-label="Start Strategy">
                         <Play className="h-4 w-4" />
                     </Button>
                 )}
                <Button variant="ghost" size="icon" aria-label="Edit Strategy">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label="Delete Strategy">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
