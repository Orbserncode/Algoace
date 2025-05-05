'use client';

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip } from "recharts";
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
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart"
import type { PerformanceDataPoint } from '@/services/monitoring-service'; // Import type


interface PerformanceChartProps {
  data: PerformanceDataPoint[]; // Use the imported type
}

const chartConfig = {
  portfolioValue: {
    label: "Portfolio Value ($)",
    color: "hsl(var(--chart-1))", // Use primary color from theme
  },
  profit: {
    label: "Cumulative Profit ($)",
    color: "hsl(var(--chart-2))", // Use accent color from theme
  },
} satisfies ChartConfig


export function PerformanceChart({ data }: PerformanceChartProps) {

   // Find min/max for dynamic Y-axis domains with padding
    const values = data.map(d => d.portfolioValue);
    const profits = data.map(d => d.profit);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const minProfit = Math.min(...profits);
    const maxProfit = Math.max(...profits);

    const valuePadding = (maxValue - minValue) * 0.1 || 1000; // Add 10% padding or 1000
    const profitPadding = (maxProfit - minProfit) * 0.1 || 100; // Add 10% padding or 100


  return (
     <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
      {data.length > 0 ? (
          <RechartsLineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
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
                 // Format date for better readability if needed
                 try {
                    const date = new Date(value);
                     if (isNaN(date.getTime())) return value; // Fallback
                     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                 } catch {
                     return value; // Fallback
                 }
              }}
               // Ensure ticks don't overlap on smaller screens
               interval="preserveStartEnd"
               minTickGap={40}
            />
            <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} // Format as thousands
                domain={[Math.max(0, minValue - valuePadding), maxValue + valuePadding]} // Dynamic domain with padding, floor at 0
              />
              <YAxis
                 yAxisId="right"
                 orientation="right"
                 tickLine={false}
                 axisLine={false}
                 tickMargin={8}
                 tickFormatter={(value) => `$${value.toLocaleString()}`} // Format with commas
                 domain={[minProfit - profitPadding, maxProfit + profitPadding]} // Dynamic domain for profit
               />
            <ChartTooltip
              cursor={true} // Show cursor line
              content={<ChartTooltipContent indicator="dot" hideLabel />} // Use dot indicator
            />
            <Line
              dataKey="portfolioValue"
              type="monotone"
              stroke="var(--color-portfolioValue)"
              strokeWidth={2}
              dot={false} // Hide dots on line for cleaner look
              yAxisId="left"
              name="Portfolio Value ($)" // Ensure name matches config if used elsewhere
            />
             <Line
                dataKey="profit"
                type="monotone"
                stroke="var(--color-profit)"
                strokeWidth={2}
                dot={false}
                yAxisId="right"
                name="Cumulative Profit ($)" // Ensure name matches config if used elsewhere
              />
          </RechartsLineChart>
       ) : (
           <div className="flex h-full w-full items-center justify-center text-muted-foreground">
               No performance data available.
           </div>
       )}
    </ChartContainer>
  );
}