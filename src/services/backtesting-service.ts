// src/services/backtesting-service.ts

/**
 * @fileOverview Service functions for fetching and managing backtest results.
 * This service would interact with a backend system responsible for running
 * backtests (likely using Lumibot or a similar engine) and storing/retrieving the results.
 */

import type { PerformanceDataPoint } from './monitoring-service'; // Reuse type for equity curve

export interface BacktestSummaryMetrics {
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number; // As a decimal, e.g., 0.15 for 15%
  winRate: number; // As a decimal, e.g., 0.65 for 65%
  totalTrades: number;
  avgTradePnl: number;
  startDate?: string; // Optional: Date backtest started
  endDate?: string; // Optional: Date backtest ended
  sharpeRatio?: number; // Optional: Add more metrics as available
  sortinoRatio?: number; // Optional
  // Add any other relevant summary metrics from your backtesting engine
}

export interface BacktestTrade {
    entryTimestamp: string;
    exitTimestamp: string;
    symbol: string;
    direction: 'Long' | 'Short';
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    // Add other trade details like fees, slippage etc.
}

export interface BacktestResults {
  strategyId: string;
  timestamp: string; // When the backtest was run
  summaryMetrics: BacktestSummaryMetrics;
  equityCurve: PerformanceDataPoint[]; // Reuse the performance data structure
  trades: BacktestTrade[];
  // Could also include parameters used for the backtest
  parameters?: Record<string, any>;
  logOutput?: string; // Raw log output from the backtesting engine (optional)
}

// --- Mock Data ---
// TODO: Replace with actual data fetching from your backend/database.
// This mock data should ideally be keyed by strategy ID.
const mockBacktestDb: Record<string, BacktestResults> = {
    'strat-001': {
        strategyId: 'strat-001',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        summaryMetrics: {
            netProfit: 1250.75,
            profitFactor: 1.95,
            maxDrawdown: 0.12, // 12%
            winRate: 0.652, // 65.2%
            totalTrades: 85,
            avgTradePnl: 14.71,
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            sharpeRatio: 1.15,
        },
        equityCurve: [ // Example simplified equity curve
            { date: '2023-01-01', portfolioValue: 10000, profit: 0 },
            { date: '2023-03-01', portfolioValue: 10500, profit: 500 },
            { date: '2023-06-01', portfolioValue: 10300, profit: 300 },
            { date: '2023-09-01', portfolioValue: 11000, profit: 1000 },
            { date: '2023-12-31', portfolioValue: 11250.75, profit: 1250.75 },
        ],
        trades: [ // Example simplified trades
            { entryTimestamp: '2023-01-10T10:00:00Z', exitTimestamp: '2023-01-10T15:30:00Z', symbol: 'AAPL', direction: 'Long', entryPrice: 130.50, exitPrice: 131.80, quantity: 10, pnl: 13.00 },
            { entryTimestamp: '2023-01-15T11:00:00Z', exitTimestamp: '2023-01-16T09:45:00Z', symbol: 'MSFT', direction: 'Long', entryPrice: 250.00, exitPrice: 248.50, quantity: 5, pnl: -7.50 },
            // ... more trades
        ],
        parameters: { short_ema: 10, long_ema: 25 }
    },
    'strat-003': {
        strategyId: 'strat-003',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        summaryMetrics: {
            netProfit: 3105.00,
            profitFactor: 2.51,
            maxDrawdown: 0.085, // 8.5%
            winRate: 0.721, // 72.1%
            totalTrades: 112,
            avgTradePnl: 27.72,
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            sharpeRatio: 1.85,
        },
        equityCurve: [
             { date: '2023-01-01', portfolioValue: 10000, profit: 0 },
             { date: '2023-03-01', portfolioValue: 10800, profit: 800 },
             { date: '2023-06-01', portfolioValue: 11500, profit: 1500 },
             { date: '2023-09-01', portfolioValue: 12800, profit: 2800 },
             { date: '2023-12-31', portfolioValue: 13105.00, profit: 3105.00 },
        ],
        trades: [
            { entryTimestamp: '2023-02-05T14:00:00Z', exitTimestamp: '2023-02-08T11:30:00Z', symbol: 'GOOGL', direction: 'Long', entryPrice: 95.00, exitPrice: 101.50, quantity: 15, pnl: 97.50 },
            // ... more trades
        ],
        parameters: { model_version: 'v2.1', confidence_threshold: 0.7 }
    },
     // Add mock data for other strategies if needed, or return a default/error state
     'strat-002': { // Example for a strategy with poor results
         strategyId: 'strat-002',
         timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
         summaryMetrics: {
             netProfit: -340.10,
             profitFactor: 0.85,
             maxDrawdown: 0.25, // 25%
             winRate: 0.489, // 48.9%
             totalTrades: 150,
             avgTradePnl: -2.27,
             startDate: '2023-01-01',
             endDate: '2023-12-31',
             sharpeRatio: -0.5,
         },
         equityCurve: [
              { date: '2023-01-01', portfolioValue: 10000, profit: 0 },
              { date: '2023-03-01', portfolioValue: 9800, profit: -200 },
              { date: '2023-06-01', portfolioValue: 10100, profit: 100 },
              { date: '2023-09-01', portfolioValue: 9500, profit: -500 },
              { date: '2023-12-31', portfolioValue: 9659.90, profit: -340.10 },
         ],
         trades: [], // Less important to mock trades for failed strategy example
         parameters: { period: 14, std_dev: 2.0 }
     },
};


// Simulate potential API/DB errors
const simulateError = (probability = 0.1) => {
    if (Math.random() < probability) {
        throw new Error("Simulated backtesting service error.");
    }
}

/**
 * Fetches the latest backtest results for a given strategy.
 * TODO: Replace with actual data fetching logic. This should query your
 *       database or results store for the most recent completed backtest run
 *       for the specified strategy ID.
 * @param strategyId The ID of the strategy.
 * @returns A promise that resolves to the BacktestResults object.
 * @throws Throws an error if the backtest results are not found or if fetching fails.
 */
export async function getBacktestResults(strategyId: string): Promise<BacktestResults> {
    console.log(`Fetching backtest results for strategy: ${strategyId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
    simulateError(0.1); // Simulate potential fetch error

    const results = mockBacktestDb[strategyId];

    if (!results) {
        // Simulate a case where backtest hasn't been run or results aren't stored
        console.warn(`No backtest results found for strategy ${strategyId}.`);
        throw new Error(`No backtest results available for strategy "${strategyId}". Please run a backtest first.`);
    }

    console.log(`Returning backtest results for ${strategyId}`);
    return results;
}

/**
 * (Optional) Triggers a new backtest run for a strategy.
 * TODO: Implement the backend logic to queue or start a backtest process.
 * This function would likely send a request to your backend API.
 * @param strategyId The ID of the strategy to backtest.
 * @param parameters Optional parameters for the backtest (e.g., date range, initial capital).
 * @returns A promise that resolves when the backtest is successfully queued or started (e.g., returns a job ID).
 */
export async function runBacktest(strategyId: string, parameters?: Record<string, any>): Promise<{ jobId: string }> {
    console.log(`Requesting backtest run for strategy: ${strategyId} with params:`, parameters);
    // Simulate API call to backend to trigger the backtest
    await new Promise(resolve => setTimeout(resolve, 500));
    simulateError(0.15); // Simulate potential error in triggering

    // --- Backend actions needed here: ---
    // 1. Validate strategyId and parameters.
    // 2. Find the strategy code (e.g., path to the .py file).
    // 3. Queue a job in a task queue (like Celery, RQ, BullMQ) or directly invoke the backtesting engine.
    // 4. The job runner would execute Lumibot (or similar) with the strategy code and parameters.
    // 5. Upon completion, the job runner saves the results (summary, equity curve, trades) to the database/store.
    // 6. Optionally update the strategy status to 'Backtesting' while running and 'Inactive'/'Active' on completion.
    // -------------------------------------

    const jobId = `backtest-${strategyId}-${Date.now()}`;
    console.log(`Backtest job queued/started for ${strategyId}. Job ID: ${jobId}`);
    return { jobId }; // Return a simulated job ID
}

/**
 * (Optional) Fetches the status of a specific backtest job.
 * TODO: Implement backend logic to check job status.
 * @param jobId The ID of the backtest job.
 * @returns A promise resolving to the job status (e.g., 'PENDING', 'RUNNING', 'COMPLETED', 'FAILED').
 */
export async function getBacktestJobStatus(jobId: string): Promise<string> {
     console.log(`Checking status for backtest job: ${jobId}`);
     await new Promise(resolve => setTimeout(resolve, 200));
     // Simulate checking status - return 'COMPLETED' for demo purposes
     const statuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'];
     // In a real app, query your task queue or job store
     return 'COMPLETED'; // Placeholder
}
