'use client';

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"; // Import ResponsiveContainer
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig // Import ChartConfig type
} from "@/components/ui/chart";
import type { PerformanceDataPoint } from '@/services/monitoring-service'; // Import type


interface PerformanceChartProps {
  data: PerformanceDataPoint[]; // Use the imported type
  config?: ChartConfig; // Optional config override
  dataKeyY?: string; // Optional: Specify which key holds the Y value (e.g., 'portfolioValue' or 'value')
  yAxisLabel?: string; // Optional: Label for the Y axis
}

const defaultChartConfig = {
  value: { // Default key for generic usage
    label: "Value ($)",
    color: "hsl(var(--chart-1))", // Use primary color from theme
  },
  portfolioValue: {
    label: "Portfolio Value ($)",
    color: "hsl(var(--chart-1))", // Use primary color from theme
  },
  profit: {
    label: "Cumulative Profit ($)",
    color: "hsl(var(--chart-2))", // Use accent color from theme
  },
} satisfies ChartConfig


export function PerformanceChart({
    data,
    config: configProp,
    dataKeyY = 'portfolioValue', // Default to portfolioValue for monitoring page
    yAxisLabel
}: PerformanceChartProps) {

   const chartConfig = configProp || defaultChartConfig;
   const activeDataKeyY = dataKeyY as keyof PerformanceDataPoint; // Type assertion

   // Ensure the active data key exists in the config, default if not
    const activeConfig = chartConfig[dataKeyY] || chartConfig['value'];
    const dynamicLabel = yAxisLabel || activeConfig?.label || "Value ($)";

   // Find min/max for dynamic Y-axis domains with padding
    const values = data.map(d => d[activeDataKeyY]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valuePadding = (maxValue - minValue) * 0.1 || 1000; // Add 10% padding or 1000

    // Check if 'profit' key exists and calculate its domain if it does
    const hasProfitData = data.length > 0 && data[0].hasOwnProperty('profit');
    let minProfit = 0, maxProfit = 0, profitPadding = 0;
    if (hasProfitData) {
        const profits = data.map(d => d.profit);
        minProfit = Math.min(...profits);
        maxProfit = Math.max(...profits);
        profitPadding = (maxProfit - minProfit) * 0.1 || 100;
    }

  return (
     // Use ChartContainer for consistent styling and context if needed elsewhere
     <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      {data.length > 0 ? (
          // ResponsiveContainer ensures the chart fills its parent
          // Removed ResponsiveContainer wrapper as ChartContainer includes it
          <RechartsLineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: hasProfitData ? 12 : 12, // Adjust right margin if profit axis is present
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                 try {
                    const date = new Date(value);
                     if (isNaN(date.getTime())) return value;
                     // Use shorter format for potentially more data points in backtest
                     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                 } catch {
                     return value;
                 }
              }}
               interval="preserveStartEnd"
               minTickGap={50} // Increase gap for potentially denser data
            />
            <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`} // More dynamic formatting
                domain={[Math.max(0, minValue - valuePadding), maxValue + valuePadding]} // Dynamic domain with padding, floor at 0
                // label={{ value: dynamicLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }, dy: -10 }} // Optional Y Axis Label
              />
              {/* Conditionally render Profit axis only if data exists */}
              {hasProfitData && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    domain={[minProfit - profitPadding, maxProfit + profitPadding]}
                  />
              )}
            <ChartTooltip
              cursor={true}
              content={<ChartTooltipContent indicator="dot" />} // Removed hideLabel, let it show date
            />
            <Line
              dataKey={dataKeyY}
              type="monotone"
              stroke={`var(--color-${dataKeyY})`} // Use dynamic color from config
              strokeWidth={2}
              dot={false}
              yAxisId="left"
              name={dynamicLabel} // Use the dynamic label for the tooltip name
            />
             {/* Conditionally render Profit line */}
             {hasProfitData && chartConfig.profit && (
                 <Line
                    dataKey="profit"
                    type="monotone"
                    stroke="var(--color-profit)"
                    strokeWidth={2}
                    dot={false}
                    yAxisId="right"
                    name={chartConfig.profit.label as string || "Cumulative Profit ($)"}
                  />
             )}
          </RechartsLineChart>
       ) : (
           <div className="flex h-full w-full items-center justify-center text-muted-foreground">
               No performance data available.
           </div>
       )}
    </ChartContainer>
  );
}
