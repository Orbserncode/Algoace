{// src/app/backtesting/_components/advanced-visualizations.tsx
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Candlestick } from 'recharts'; // Import ComposedChart and Candlestick directly
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart"; // Removed Candlestick import from here
import type { BacktestTrade } from '@/services/backtesting-service'; // Import trade type
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from 'react';

interface AdvancedVisualizationsProps {
  trades: BacktestTrade[];
  isLoading: boolean;
  // Add equity curve data if needed for candlestick
  equityCurve?: { date: string; open?: number; high?: number; low?: number; close: number }[]; // Example structure for candlestick
}

// Chart Configurations
const barChartConfig = {
  pnl: { label: "P&L ($)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const pieChartConfig = {
  winning: { label: "Winning Trades", color: "hsl(var(--chart-2))" }, // Greenish/Accent
  losing: { label: "Losing Trades", color: "hsl(var(--destructive))" }, // Reddish
} satisfies ChartConfig;

const candlestickChartConfig = {
    value: { label: "Value ($)", color: "hsl(var(--chart-1))" }, // Use a base color
    // Recharts Candlestick doesn't use explicit colors here, but based on open/close
} satisfies ChartConfig;

// Helper to group trades by month or other criteria
const groupTradesByMonth = (trades: BacktestTrade[]) => {
    const monthlyPnl: Record<string, number> = {};
    trades.forEach(trade => {
        try {
            const month = new Date(trade.exitTimestamp).toISOString().slice(0, 7); // YYYY-MM
            monthlyPnl[month] = (monthlyPnl[month] || 0) + trade.pnl;
        } catch {
            console.warn("Could not parse trade timestamp for grouping:", trade.exitTimestamp);
        }
    });
    return Object.entries(monthlyPnl)
        .map(([month, pnl]) => ({ month, pnl: parseFloat(pnl.toFixed(2)) }))
        .sort((a, b) => a.month.localeCompare(b.month)); // Sort by month
};


export function AdvancedVisualizations({ trades, isLoading, equityCurve = [] }: AdvancedVisualizationsProps) {
    const [candlestickRange, setCandlestickRange] = useState<string>("all"); // "all", "3m", "6m", "1y"

    // Memoize calculations to avoid recomputing on every render
    const monthlyPnlData = useMemo(() => groupTradesByMonth(trades), [trades]);
    const winLossData = useMemo(() => {
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const losingTrades = trades.filter(t => t.pnl <= 0).length;
        return [
            { name: 'Winning Trades', value: winningTrades, fill: 'var(--color-winning)' },
            { name: 'Losing Trades', value: losingTrades, fill: 'var(--color-losing)' },
        ];
    }, [trades]);

     // Filter candlestick data based on selected range
     const filteredCandlestickData = useMemo(() => {
        if (candlestickRange === "all" || equityCurve.length === 0) {
            return equityCurve;
        }

        const endDate = new Date(equityCurve[equityCurve.length - 1].date);
        let startDate = new Date(endDate);

        switch (candlestickRange) {
            case "3m":
                startDate.setMonth(startDate.getMonth() - 3);
                break;
            case "6m":
                startDate.setMonth(startDate.getMonth() - 6);
                break;
            case "1y":
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                return equityCurve; // Should not happen
        }

        const startIndex = equityCurve.findIndex(d => new Date(d.date) >= startDate);
        return startIndex === -1 ? [] : equityCurve.slice(startIndex);

     }, [equityCurve, candlestickRange]);


    // --- Render Functions ---

    const renderMonthlyPnlChart = () => (
        <Card>
            <CardHeader>
                <CardTitle>Monthly P&L</CardTitle>
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
                                <YAxis tickFormatter={(value) => `$${value}`} tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                <ChartTooltip
                                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                                    content={<ChartTooltipContent indicator="dot" />}
                                />
                                <Bar dataKey="pnl" name="Monthly P&L">
                                    {monthlyPnlData.map((entry) => (
                                         <Cell key={`cell-${entry.month}`} fill={entry.pnl >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                             No trade data for monthly P&L chart.
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
                                     cy="50%" // Center vertically
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
        // Check if data has the required OHLC fields (open, high, low, close)
        const hasOHLC = filteredCandlestickData.length > 0 &&
                       filteredCandlestickData.every(d =>
                           typeof d.open === 'number' &&
                           typeof d.high === 'number' &&
                           typeof d.low === 'number' &&
                           typeof d.close === 'number'
                       );

        // Check if there's enough data to display
        const hasEnoughData = filteredCandlestickData.length > 1;

        // Format data for candlestick (needs date, open, high, low, close)
        const chartData = hasOHLC ? filteredCandlestickData.map(d => ({
            date: d.date, // Keep original date string for XAxis
            // Values should be numbers: [open, high, low, close]
            value: [d.open!, d.high!, d.low!, d.close]
        })) : [];

        // Calculate domain for Y-axis with padding
        let yDomain: [number, number] = [0, 10000]; // Default domain
        if (hasOHLC && hasEnoughData) {
            const lows = filteredCandlestickData.map(d => d.low!);
            const highs = filteredCandlestickData.map(d => d.high!);
            const minVal = Math.min(...lows);
            const maxVal = Math.max(...highs);
            const padding = (maxVal - minVal) * 0.1;
            yDomain = [Math.max(0, minVal - padding), maxVal + padding];
        }

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <div>
                         <CardTitle>Price Candlestick Chart</CardTitle>
                         <CardDescription>Visualizes price movement over the selected period.</CardDescription>
                     </div>
                     <Select value={candlestickRange} onValueChange={setCandlestickRange} disabled={isLoading}>
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
                                 {/* Use ComposedChart which supports Candlestick */}
                                 <ComposedChart
                                     data={chartData}
                                     margin={{ top: 5, right: 5, left: -15, bottom: 5 }}
                                 >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        fontSize={10}
                                        interval="preserveStartEnd" // Adjust interval for better readability
                                        minTickGap={50}
                                        tickFormatter={(value) => {
                                            try {
                                                return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            } catch { return value; }
                                        }}
                                    />
                                     <YAxis
                                        orientation="left"
                                        domain={yDomain}
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        fontSize={10}
                                        tickFormatter={(value) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                    />
                                    <RechartsTooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload, label }) => {
                                             if (active && payload && payload.length) {
                                                 const data = payload[0].payload; // Access the raw data point
                                                 const [open, high, low, close] = data.value;
                                                 return (
                                                     <div className="rounded-lg border bg-background p-2 shadow-sm">
                                                         <div className="grid grid-cols-2 gap-2">
                                                             <div className="flex flex-col">
                                                                 <span className="text-[0.70rem] uppercase text-muted-foreground">Date</span>
                                                                 <span className="font-bold">{label}</span>
                                                             </div>
                                                              <div className="flex flex-col">
                                                                 <span className="text-[0.70rem] uppercase text-muted-foreground">Close</span>
                                                                  <span className={`font-bold ${close >= open ? 'text-green-600' : 'text-red-600'}`}>
                                                                     ${close.toFixed(2)}
                                                                  </span>
                                                             </div>
                                                              <div className="flex flex-col">
                                                                 <span className="text-[0.70rem] uppercase text-muted-foreground">Open</span>
                                                                 <span className="font-bold text-muted-foreground">${open.toFixed(2)}</span>
                                                             </div>
                                                               <div className="flex flex-col">
                                                                 <span className="text-[0.70rem] uppercase text-muted-foreground">High</span>
                                                                 <span className="font-bold text-muted-foreground">${high.toFixed(2)}</span>
                                                             </div>
                                                              <div className="flex flex-col">
                                                                 <span className="text-[0.70rem] uppercase text-muted-foreground">Low</span>
                                                                 <span className="font-bold text-muted-foreground">${low.toFixed(2)}</span>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 );
                                             }
                                             return null;
                                        }}
                                     />
                                     <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                                     {/* Candlestick series - use the component tag */}
                                     <Candlestick
                                         dataKey="value"
                                         fill="hsl(var(--primary))" // Base fill color
                                         stroke="hsl(var(--primary-foreground))" // Border color
                                         isAnimationActive={false} // Disable animation for performance with larger datasets
                                         // Colors are typically handled by the component based on open/close
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


    // --- Main Render ---
    return (
        <div className="space-y-6 mt-6">
            <Card>
                <CardHeader>
                     <CardTitle>Advanced Backtest Analysis</CardTitle>
                     <CardDescription>Detailed visualizations of trade performance.</CardDescription>
                </CardHeader>
                 <CardContent className="grid gap-6 md:grid-cols-2">
                    {renderMonthlyPnlChart()}
                    {renderWinLossPieChart()}
                     <div className="md:col-span-2"> {/* Candlestick spans both columns */}
                        {renderCandlestickChart()}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
