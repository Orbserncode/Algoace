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
import { ArrowLeft, ArrowRight, Filter, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
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

interface TradeFilters {
  symbol?: string;
  tradeType?: 'BUY' | 'SELL' | '';
  tradingMethod?: string;
  assetType?: string;
  isWinning?: boolean | null;
  dateFrom?: string;
  dateTo?: string;
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

export function StrategyTradesTable({ trades, totalTrades, page, rowsPerPage, onPageChange }: StrategyTradesTableProps) {
  const [filters, setFilters] = useState<TradeFilters>({});
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>(trades);
  const [filteredTotal, setFilteredTotal] = useState<number>(totalTrades);
  const [showFilters, setShowFilters] = useState(false);
  
  // Update filtered trades when trades or filters change
  useEffect(() => {
    const filtered = trades.filter(trade => {
      // Symbol filter
      if (filters.symbol && !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
        return false;
      }
      
      // Trade type filter
      if (filters.tradeType && trade.tradeType !== filters.tradeType) {
        return false;
      }
      
      // Trading method filter
      if (filters.tradingMethod && trade.tradingMethod !== filters.tradingMethod) {
        return false;
      }
      
      // Asset type filter
      if (filters.assetType && trade.assetType !== filters.assetType) {
        return false;
      }
      
      // Winning/losing filter
      if (filters.isWinning !== null && filters.isWinning !== undefined &&
          trade.isWinning !== filters.isWinning) {
        return false;
      }
      
      // Date range filter
      if (filters.dateFrom) {
        const tradeDate = new Date(trade.timestamp);
        const fromDate = new Date(filters.dateFrom);
        if (tradeDate < fromDate) {
          return false;
        }
      }
      
      if (filters.dateTo) {
        const tradeDate = new Date(trade.timestamp);
        const toDate = new Date(filters.dateTo);
        // Set time to end of day
        toDate.setHours(23, 59, 59, 999);
        if (tradeDate > toDate) {
          return false;
        }
      }
      
      return true;
    });
    
    setFilteredTrades(filtered);
    setFilteredTotal(filtered.length);
  }, [trades, filters]);

  const totalPages = Math.ceil(filteredTotal / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage + 1;
  const endIndex = Math.min(page * rowsPerPage, filteredTotal);

  const getTradeTypeBadge = (type: Trade['tradeType']) => {
     return type === 'BUY' ? 'default' : 'destructive';
  };

  const getPnlClass = (pnl: number | undefined | null) => {
    if (pnl === undefined || pnl === null) return '';
    return pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };
  
  const resetFilters = () => {
    setFilters({});
    onPageChange(1); // Reset to first page
  };
  
  // Get unique values for filter dropdowns
  const uniqueSymbols = Array.from(new Set(trades.map(t => t.symbol)));
  const uniqueTradingMethods = Array.from(new Set(trades.map(t => t.tradingMethod)));
  const uniqueAssetTypes = Array.from(new Set(trades.map(t => t.assetType)));

  return (
    <div className="space-y-4">
        {/* Filters */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Strategy Trades</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20">
            <div className="space-y-2">
              <Label htmlFor="symbol-filter">Symbol</Label>
              <Select
                value={filters.symbol || ""}
                onValueChange={(value) => setFilters({...filters, symbol: value})}
              >
                <SelectTrigger id="symbol-filter">
                  <SelectValue placeholder="All symbols" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All symbols</SelectItem>
                  {uniqueSymbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type-filter">Trade Type</Label>
              <Select
                value={filters.tradeType || ""}
                onValueChange={(value: any) => setFilters({...filters, tradeType: value})}
              >
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="method-filter">Trading Method</Label>
              <Select
                value={filters.tradingMethod || ""}
                onValueChange={(value) => setFilters({...filters, tradingMethod: value})}
              >
                <SelectTrigger id="method-filter">
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  {uniqueTradingMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="asset-filter">Asset Type</Label>
              <Select
                value={filters.assetType || ""}
                onValueChange={(value) => setFilters({...filters, assetType: value})}
              >
                <SelectTrigger id="asset-filter">
                  <SelectValue placeholder="All assets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assets</SelectItem>
                  {uniqueAssetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="mb-2 block">Trade Result</Label>
              <Select
                value={filters.isWinning === null ? "" : filters.isWinning === true ? "winning" : "losing"}
                onValueChange={(value) => {
                  let isWinning = null;
                  if (value === "winning") isWinning = true;
                  if (value === "losing") isWinning = false;
                  setFilters({...filters, isWinning});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All trades</SelectItem>
                  <SelectItem value="winning">Winning trades</SelectItem>
                  <SelectItem value="losing">Losing trades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        )}
        
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
                  {filteredTrades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        No trades found for this period or strategy.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrades.map((trade) => (
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
        {filteredTotal > 0 && (
            <div className="flex items-center justify-between space-x-2 pt-2">
                <span className="text-sm text-muted-foreground">
                    Showing {startIndex} - {endIndex} of {filteredTotal} trades
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

    