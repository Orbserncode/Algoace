// src/app/monitoring/_components/strategy-trades-table.tsx
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Trade } from '@/services/monitoring-service';
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For formatting timestamps

interface StrategyTradesTableProps {
  trades: Trade[];
  totalTrades: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (newPage: number) => void;
}

// Helper to format currency/numbers, can be moved to utils
const formatNumberValue = (value: number | undefined | null, options?: Intl.NumberFormatOptions): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('en-US', options);
};

const formatTimestamp = (timestamp: string): string => {
    try {
        return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
    } catch {
        return 'Invalid Date';
    }
};

export function StrategyTradesTable({ trades, totalTrades, page, rowsPerPage, onPageChange }: StrategyTradesTableProps) {

  const totalPages = Math.ceil(totalTrades / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(page * rowsPerPage, totalTrades);

  const getTradeTypeBadge = (type: Trade['tradeType']) => {
     return type === 'BUY' ? 'default' : 'destructive';
  };

   const getPnlClass = (pnl: number | undefined | null) => {
     if (pnl === undefined || pnl === null) return '';
     return pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
   };

  return (
    <div className="space-y-4">
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="hidden md:table-cell">Type</TableHead>
                    <TableHead className="hidden lg:table-cell">Method</TableHead>
                    <TableHead className="hidden lg:table-cell">Asset</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Entry Price</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Exit Price</TableHead>
                    <TableHead className="text-right w-[100px]">P&L ($)</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {trades.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No trades found for this period or strategy.
                    </TableCell>
                    </TableRow>
                ) : (
                    trades.map((trade) => (
                    <TableRow key={trade.id}>
                        <TableCell className="font-medium tabular-nums">{formatTimestamp(trade.timestamp)}</TableCell>
                        <TableCell>{trade.symbol}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <Badge variant={getTradeTypeBadge(trade.tradeType)}>{trade.tradeType}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{trade.tradingMethod}</TableCell>
                        <TableCell className="hidden lg:table-cell">{trade.assetType}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumberValue(trade.lotSize)}</TableCell>
                        <TableCell className="text-right hidden sm:table-cell tabular-nums">
                            {formatNumberValue(trade.entryPrice, { style: 'currency', currency: 'USD' })}
                        </TableCell>
                         <TableCell className="text-right hidden sm:table-cell tabular-nums">
                            {formatNumberValue(trade.exitPrice, { style: 'currency', currency: 'USD' })}
                        </TableCell>
                         <TableCell className={cn("text-right tabular-nums font-medium", getPnlClass(trade.pnl))}>
                            {formatNumberValue(trade.pnl, { signDisplay: 'auto' })}
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
        </div>
        {/* Pagination Controls */}
        {totalTrades > 0 && (
            <div className="flex items-center justify-between space-x-2 pt-2">
                <span className="text-sm text-muted-foreground">
                    Showing {startIndex} - {endIndex} of {totalTrades} trades
                </span>
                <div className="space-x-2">
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Previous
                    </Button>
                    <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    >
                    Next
                    <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
    </div>
  );
}

    