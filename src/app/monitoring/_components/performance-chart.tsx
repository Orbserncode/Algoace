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


interface PerformanceChartProps {
  data: Array<{ date: string; portfolioValue: number; profit: number }>;
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
  return (
     <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
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
             const date = new Date(value);
             return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
        />
         <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `$${value / 1000}k`} // Format as thousands
            domain={['dataMin - 1000', 'dataMax + 1000']} // Add some padding
          />
          <YAxis
             yAxisId="right"
             orientation="right"
             tickLine={false}
             axisLine={false}
             tickMargin={8}
             tickFormatter={(value) => `$${value}`}
             domain={['auto', 'auto']} // Auto domain for profit
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
          name="Portfolio Value ($)"
        />
         <Line
            dataKey="profit"
            type="monotone"
            stroke="var(--color-profit)"
            strokeWidth={2}
            dot={false}
            yAxisId="right"
            name="Cumulative Profit ($)"
          />
      </RechartsLineChart>
    </ChartContainer>
  );
}
