// src/app/monitoring/_components/live-broker-trades-table.tsx
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
import { RefreshCw } from "lucide-react";
import type { Trade } from '@/services/monitoring-service';
import { closeTrade } from '@/services/monitoring-service';
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For formatting timestamps
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, LayoutList } from "lucide-react";

// Extended Trade interface with broker and leverage information
interface ExtendedTrade extends Trade {
  brokerName?: string;
  pipsPnL?: number;
  leverage?: number;
  isWinning?: boolean;
}

interface LiveBrokerTradesTableProps {
  trades: ExtendedTrade[];
  isLoading: boolean;
  onRefresh: () => void;
  onTradeClose?: (tradeId: string) => void;
}

// Helper to format currency/numbers, can be moved to utils
const formatNumberValue = (value: number | undefined | null, options?: Intl.NumberFormatOptions): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('en-US', options);
};

const formatTimestamp = (timestamp: string): string => {
    try {
        return format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
        return 'Invalid Date';
    }
};

export function LiveBrokerTradesTable({ trades, isLoading, onRefresh, onTradeClose }: LiveBrokerTradesTableProps) {
  const getTradeTypeBadge = (type: Trade['tradeType']) => {
     return type === 'BUY' ? 'default' : 'destructive';
  };

  const getPnlClass = (isWinning?: boolean) => {
    if (isWinning === undefined) return '';
    return isWinning ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);

  const handleCloseTrade = async (tradeId: string) => {
    setClosingTradeId(tradeId);
    try {
      await closeTrade(tradeId);
      if (onTradeClose) {
        onTradeClose(tradeId);
      } else {
        // If no callback provided, just refresh
        onRefresh();
      }
      toast({
        title: "Trade closed",
        description: "The trade has been successfully closed",
      });
    } catch (error) {
      console.error("Failed to close trade:", error);
      toast({
        title: "Error",
        description: "Failed to close the trade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClosingTradeId(null);
    }
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Live Broker Trades</h3>
            <div className="flex items-center gap-2">
                <Tabs
                    value={viewMode}
                    onValueChange={(value) => setViewMode(value as 'cards' | 'table')}
                    className="mr-2"
                >
                    <TabsList className="grid w-[160px] grid-cols-2">
                        <TabsTrigger value="cards" className="flex items-center gap-1">
                            <LayoutGrid className="h-4 w-4" />
                            <span className="hidden sm:inline">Cards</span>
                        </TabsTrigger>
                        <TabsTrigger value="table" className="flex items-center gap-1">
                            <LayoutList className="h-4 w-4" />
                            <span className="hidden sm:inline">Table</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>
        </div>
        
        {trades.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            {isLoading ? "Loading trades..." : "No open trades found."}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trades.map((trade) => (
              <div key={trade.id} className="rounded-md border p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{trade.symbol}</span>
                    <Badge variant={getTradeTypeBadge(trade.tradeType)}>{trade.tradeType}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{format(new Date(trade.timestamp), 'MM/dd HH:mm')}</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className={cn("text-xl font-bold", getPnlClass(trade.isWinning))}>
                    <div className="flex items-center gap-2">
                      {trade.pipsPnL !== undefined ? formatNumberValue(trade.pipsPnL, { signDisplay: 'auto' }) : '-'} pips
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTrade(trade.id);
                        }}
                        disabled={closingTradeId === trade.id}
                      >
                        {closingTradeId === trade.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Close"
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">{trade.brokerName || 'Default'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Size</div>
                    <div className="font-medium">{formatNumberValue(trade.lotSize)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Leverage</div>
                    <div className="font-medium">{trade.leverage !== undefined ? `${trade.leverage}x` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Entry Price</div>
                    <div className="font-medium">{formatNumberValue(trade.entryPrice, { style: 'currency', currency: 'USD' })}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Strategy</div>
                    <div className="font-medium truncate">{trade.strategyName || trade.strategyId}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-max w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Timestamp</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Entry Price</TableHead>
                  <TableHead className="text-right">P&L (pips)</TableHead>
                  <TableHead className="text-right">Leverage</TableHead>
                  <TableHead>Strategy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium tabular-nums text-sm">{format(new Date(trade.timestamp), 'MM/dd HH:mm')}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={getTradeTypeBadge(trade.tradeType)}>{trade.tradeType}</Badge>
                    </TableCell>
                    <TableCell>{trade.brokerName || 'Default'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumberValue(trade.lotSize)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumberValue(trade.entryPrice, { style: 'currency', currency: 'USD' })}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium", getPnlClass(trade.isWinning))}>
                      <div className="flex items-center justify-end gap-2">
                        {trade.pipsPnL !== undefined ? formatNumberValue(trade.pipsPnL, { signDisplay: 'auto' }) : '-'}
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2 h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTrade(trade.id);
                          }}
                          disabled={closingTradeId === trade.id}
                        >
                          {closingTradeId === trade.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Close"
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {trade.leverage !== undefined ? `${trade.leverage}x` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {trade.strategyName || trade.strategyId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
    </div>
  );
}