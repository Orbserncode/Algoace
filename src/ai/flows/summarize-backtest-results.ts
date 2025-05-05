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
  profitFactor: z.number().describe('The profit factor of the trading strategy (Gross Profit / Gross Loss). Higher is better (>1).'),
  drawdown: z.number().describe('The maximum peak-to-trough decline in portfolio value during the backtest (as a percentage, e.g., 15 for 15%). Lower is better.'),
  winRate: z.number().describe('The percentage of trades that were profitable (e.g., 65 for 65%).'),
  totalTrades: z.number().describe('The total number of trades executed in the backtest.'),
  netProfit: z.number().describe('The total net profit or loss of the trading strategy over the backtest period.'),
  strategyDescription: z.string().describe('A brief description of the trading strategy being analyzed.'),
});
export type SummarizeBacktestResultsInput = z.infer<typeof SummarizeBacktestResultsInputSchema>;

const SummarizeBacktestResultsOutputSchema = z.object({
  summary: z.string().describe('A concise, human-readable interpretation of the backtest results, highlighting strengths and weaknesses.'),
});
export type SummarizeBacktestResultsOutput = z.infer<typeof SummarizeBacktestResultsOutputSchema>;

export async function summarizeBacktestResults(
  input: SummarizeBacktestResultsInput
): Promise<SummarizeBacktestResultsOutput> {
  // Basic validation before calling flow
  if (input.totalTrades <= 0) {
       return { summary: "No trades were executed in this backtest, so no performance analysis is possible." };
   }
  return summarizeBacktestResultsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBacktestResultsPrompt',
  input: {
    schema: SummarizeBacktestResultsInputSchema, // Use the updated schema with description
  },
  output: {
    schema: SummarizeBacktestResultsOutputSchema,
  },
  prompt: `You are an expert financial analyst interpreting backtest results for a trading strategy.

  Strategy Description: {{{strategyDescription}}}

  Key Backtest Metrics:
  - Net Profit: {{{netProfit}}}
  - Profit Factor: {{{profitFactor}}}
  - Max Drawdown: {{{drawdown}}}%
  - Win Rate: {{{winRate}}}%
  - Total Trades: {{{totalTrades}}}

  Based *only* on the provided metrics and strategy description, provide a concise (2-4 sentences) human-readable interpretation. Focus on the potential viability, strengths, and weaknesses indicated by these numbers.

  - Is the strategy profitable overall (Net Profit > 0)?
  - How efficient is it at generating profit (Profit Factor)? (Good > 1.5, Excellent > 2.0)
  - How risky is it (Max Drawdown)? (Low < 10%, Moderate < 20%, High > 20%)
  - How often does it win (Win Rate)? (Good > 55%)
  - Is the number of trades sufficient for statistical significance (e.g., > 30-50 trades)?

  Combine these points into a brief, insightful summary. Avoid making definitive predictions about future performance. Start the summary directly, without preamble like "Summary:".

  Example Interpretation Structure:
  "This [profitable/unprofitable] strategy shows [strong/moderate/weak] profit efficiency (PF: {{{profitFactor}}}) but comes with [low/moderate/high] risk (MDD: {{{drawdown}}}%). The [high/moderate/low] win rate ({{{winRate}}}%) over {{{totalTrades}}} trades suggests [consistency/inconsistency]. Overall, it [appears promising but needs risk management / needs improvement / shows potential / etc.]."

  Your Summary:
  `,
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
