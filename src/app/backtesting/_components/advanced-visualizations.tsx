
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from 'recharts';
// Removed direct import of Candlestick and redundant RechartsPrimitive import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, RechartsPrimitive } from '@/components/ui/chart'; // Import RechartsPrimitive from ui/chart
import type { BacktestTrade } from '@/services/backtesting-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AdvancedVisualizationsProps {
  trades: BacktestTrade[];
  isLoading: boolean;
  equityCurve?: { date: string; open?: number; high?: number; low?: number; close: number }[];
}

const barChartConfig = {
  pnl: { label: 'P&L ($)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const pieChartConfig = {
  winning: { label: 'Winning Trades', color: 'hsl(var(--chart-2))' },
  losing: { label: 'Losing Trades', color: 'hsl(var(--destructive))' },
} satisfies ChartConfig;

const candlestickChartConfig = {
  value: { label: 'Value ($)', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

// Helper to group trades by month
const groupTradesByMonth = (trades: BacktestTrade[]) => {
  const monthlyPnl: Record<string, number> = {};
  trades.forEach((trade) => {
    try {
      if (!trade.exitTimestamp || isNaN(new Date(trade.exitTimestamp).getTime())) {
        console.warn('Invalid or missing trade exit timestamp for grouping:', trade);
        return;
      }
      const month = new Date(trade.exitTimestamp).toISOString().slice(0, 7);
      monthlyPnl[month] = (monthlyPnl[month] || 0) + trade.pnl;
    } catch (e) {
      console.error('Error processing trade timestamp for grouping:', trade.exitTimestamp, e);
    }
  });
  return Object.entries(monthlyPnl)
    .map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export function AdvancedVisualizations({ trades, isLoading, equityCurve = [] }: AdvancedVisualizationsProps) {
  const [candlestickRange, setCandlestickRange] = useState<string>('all');

  const monthlyPnlData = useMemo(() => groupTradesByMonth(trades), [trades]);
  const winLossData = useMemo(() => {
    const winningTrades = trades.filter((t) => t.pnl > 0).length;
    const losingTrades = trades.filter((t) => t.pnl <= 0).length;
    return [
      { name: 'Winning Trades', value: winningTrades, fill: 'var(--color-winning)' },
      { name: 'Losing Trades', value: losingTrades, fill: 'var(--color-losing)' },
    ];
  }, [trades]);

  const filteredCandlestickData = useMemo(() => {
    if (!equityCurve || equityCurve.length === 0) return [];
    const validEquityCurve = equityCurve.filter((d) => d.date && !isNaN(new Date(d.date).getTime()));
    if (validEquityCurve.length === 0) return [];
    if (candlestickRange === 'all') {
      return validEquityCurve;
    }
    const endDate = new Date(validEquityCurve[validEquityCurve.length - 1].date);
    let startDate = new Date(endDate);
    switch (candlestickRange) {
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        return validEquityCurve;
    }
    const startIndex = validEquityCurve.findIndex((d) => new Date(d.date) >= startDate);
    return startIndex === -1 ? [] : validEquityCurve.slice(startIndex);
  }, [equityCurve, candlestickRange]);

  // --- Render Functions ---

  const renderMonthlyPnlChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Monthly P&amp;L</CardTitle>
        <CardDescription>Profit and loss aggregated by month.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={barChartConfig} className="aspect-auto h-[250px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : monthlyPnlData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnlData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                <YAxis
                  tickFormatter={(value) => `$${value}`}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={10}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="pnl" name="Monthly P&L">
                  {monthlyPnlData.map((entry) => (
                    <Cell
                      key={`cell-${entry.month}`}
                      fill={entry.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No trade data for monthly P&amp;L chart.
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );

  const renderWinLossPieChart = () => (
    <Card>
      <CardHeader>
        <CardTitle>Trade Distribution</CardTitle>
        <CardDescription>Ratio of winning vs. losing trades.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {/* Define CSS variables for fill colors */}
        <style jsx global>{`
          :root {
            --color-winning: hsl(var(--chart-2));
            --color-losing: hsl(var(--destructive));
          }
          .dark {
            --color-winning: hsl(var(--chart-2));
            --color-losing: hsl(var(--destructive));
          }
        `}</style>
        <ChartContainer config={pieChartConfig} className="aspect-square h-[200px]">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-full" />
          ) : trades.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={winLossData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  strokeWidth={2}
                  cy="50%"
                >
                  {winLossData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} stroke={entry.fill} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              No trade data for win/loss chart.
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );

  const renderCandlestickChart = () => {
    const hasOHLC =
      filteredCandlestickData.length > 0 &&
      filteredCandlestickData.every(
        (d) =>
          typeof d.open === 'number' &&
          typeof d.high === 'number' &&
          typeof d.low === 'number' &&
          typeof d.close === 'number'
      );
    const hasEnoughData = filteredCandlestickData.length > 1;

    const chartData = hasOHLC
      ? filteredCandlestickData
          .slice() // Create a shallow copy before sorting to avoid mutating the original array
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((d) => ({
            date: d.date,
            open: d.open!,
            high: d.high!,
            low: d.low!,
            close: d.close!,
          }))
      : [];

    let yDomain: [number, number] = [0, 10000];
    if (hasOHLC && hasEnoughData) {
      const lows = filteredCandlestickData.map((d) => d.low!).filter((v) => typeof v === 'number');
      const highs = filteredCandlestickData.map((d) => d.high!).filter((v) => typeof v === 'number');
      if (lows.length > 0 && highs.length > 0) {
        const minVal = Math.min(...lows);
        const maxVal = Math.max(...highs);
        const padding = (maxVal - minVal) * 0.1 || (maxVal * 0.1);
        yDomain = [Math.max(0, minVal - padding), maxVal + padding];
      }
    }

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Equity Candlestick Chart</CardTitle>
            <CardDescription>Visualizes equity movement over the selected period.</CardDescription>
          </div>
          <Select
            value={candlestickRange}
            onValueChange={setCandlestickRange}
            disabled={isLoading || !hasOHLC || !hasEnoughData}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="3m">3 Months</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ChartContainer config={candlestickChartConfig} className="aspect-video h-[300px] w-full">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : hasOHLC && hasEnoughData ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={10}
                    interval="preserveStartEnd"
                    minTickGap={40}
                    tickFormatter={(value) => {
                      try {
                        return new Date(value).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                      } catch {
                        return value;
                      }
                    }}
                  />
                  <YAxis
                    orientation="left"
                    domain={yDomain}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={10}
                    tickFormatter={(value) =>
                      `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    }
                    width={50}
                  />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (
                          data &&
                          typeof data.open === 'number' &&
                          typeof data.high === 'number' &&
                          typeof data.low === 'number' &&
                          typeof data.close === 'number'
                        ) {
                          // Ensure date is formatted correctly
                          const formattedDate = new Date(label).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
                                        <span className="font-bold">{formattedDate}</span>
                                    </div>
                                      <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">Close</span>
                                         <span className={`font-bold ${data.close >= data.open ? 'text-green-600' : 'text-red-600'}`}>
                                            ${data.close?.toFixed(2) ?? 'N/A'}
                                         </span>
                                    </div>
                                      <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">Open</span>
                                        <span className="font-bold text-muted-foreground">${data.open?.toFixed(2) ?? 'N/A'}</span>
                                    </div>
                                      <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">High</span>
                                        <span className="font-bold text-muted-foreground">${data.high?.toFixed(2) ?? 'N/A'}</span>
                                    </div>
                                      <div className="flex flex-col">
                                        <span className="text-[0.70rem] uppercase text-muted-foreground">Low</span>
                                        <span className="font-bold text-muted-foreground">${data.low?.toFixed(2) ?? 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                          );
                        }
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <RechartsPrimitive.Candlestick
                    dataKey="close" // This should be a value that exists in chartData objects if used as dataKey like this
                    // If you map chartData to have a 'value' array like [open, high, low, close], then use dataKey="value"
                    // Or, directly provide individual keys if Candlestick component supports it:
                    openKey="open"
                    highKey="high"
                    lowKey="low"
                    closeKey="close" // This was missing, which is crucial
                    fill="hsl(var(--primary))" // Base fill color
                    stroke="hsl(var(--primary-foreground))" // Border color
                    isAnimationActive={false}
                    // upColor="hsl(var(--chart-2))" // Optional override for up candles
                    // downColor="hsl(var(--destructive))" // Optional override for down candles
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                 {isLoading ? 'Loading...' : !hasOHLC ? 'OHLC data not available for candlestick chart.' : 'Not enough data points for candlestick chart.'}
              </div>
            )}
          </ChartContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 mt-6">
         {renderMonthlyPnlChart()}
         {renderWinLossPieChart()}
         <div className="md:col-span-2">
             {renderCandlestickChart()}
         </div>
         {/* Optional: Trade Log Section */}
         <Card className="md:col-span-2">
            <CardHeader>
                 <CardTitle>Trade Log</CardTitle>
                 <CardDescription>Detailed list of trades executed during the backtest.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                    {isLoading ? (
                        <Skeleton className="h-full w-full" />
                    ) : trades.length > 0 ? (
                        <ul className="space-y-2">
                            {trades.map((trade, index) => (
                                <li key={index} className="text-xs text-muted-foreground">
                                    {trade.direction} {trade.symbol} @ {trade.entryPrice} -&gt; {trade.exitPrice} (P&amp;L: {trade.pnl.toFixed(2)}) [{new Date(trade.entryTimestamp).toLocaleString()} - {new Date(trade.exitTimestamp).toLocaleString()}]
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-muted-foreground py-4">No trades recorded for this backtest.</p>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    </div>
  );
}

