'use server';

/**
 * @fileOverview Summarizes backtest results of a trading strategy in a human-readable format.
 *
 * - summarizeBacktestResults - A function that summarizes backtest results.
 * - SummarizeBacktestResultsInput - The input type for the summarizeBacktestResults function.
 * - SummarizeBacktestResultsOutput - The return type for the summarizeBacktestResults function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeBacktestResultsInputSchema = z.object({
  profitFactor: z.number().describe('The profit factor of the trading strategy.'),
  drawdown: z.number().describe('The maximum drawdown of the trading strategy.'),
  winRate: z.number().describe('The win rate of the trading strategy (as a percentage).'),
  totalTrades: z.number().describe('The total number of trades executed in the backtest.'),
  netProfit: z.number().describe('The net profit of the trading strategy.'),
  strategyDescription: z.string().describe('A description of the trading strategy.'),
});
export type SummarizeBacktestResultsInput = z.infer<typeof SummarizeBacktestResultsInputSchema>;

const SummarizeBacktestResultsOutputSchema = z.object({
  summary: z.string().describe('A human-readable summary of the backtest results.'),
});
export type SummarizeBacktestResultsOutput = z.infer<typeof SummarizeBacktestResultsOutputSchema>;

export async function summarizeBacktestResults(
  input: SummarizeBacktestResultsInput
): Promise<SummarizeBacktestResultsOutput> {
  return summarizeBacktestResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBacktestResultsPrompt',
  input: {
    schema: z.object({
      profitFactor: z.number().describe('The profit factor of the trading strategy.'),
      drawdown: z.number().describe('The maximum drawdown of the trading strategy.'),
      winRate: z.number().describe('The win rate of the trading strategy (as a percentage).'),
      totalTrades: z.number().describe('The total number of trades executed in the backtest.'),
      netProfit: z.number().describe('The net profit of the trading strategy.'),
      strategyDescription: z.string().describe('A description of the trading strategy.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A human-readable summary of the backtest results.'),
    }),
  },
  prompt: `You are an expert financial analyst summarizing backtest results of a trading strategy.

  Given the following backtest results, provide a concise, human-readable summary, highlighting key metrics such as profit factor, drawdown, and win rate.

  Strategy Description: {{{strategyDescription}}}
  Profit Factor: {{{profitFactor}}}
  Drawdown: {{{drawdown}}}
  Win Rate: {{{winRate}}}%
  Total Trades: {{{totalTrades}}}
  Net Profit: {{{netProfit}}}

  Summary: `,
});

const summarizeBacktestResultsFlow = ai.defineFlow<
  typeof SummarizeBacktestResultsInputSchema,
  typeof SummarizeBacktestResultsOutputSchema
>(
  {
    name: 'summarizeBacktestResultsFlow',
    inputSchema: SummarizeBacktestResultsInputSchema,
    outputSchema: SummarizeBacktestResultsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
