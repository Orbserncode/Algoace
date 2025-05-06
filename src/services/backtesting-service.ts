// src/services/backtesting-service.ts

/**
 * @fileOverview Service functions for fetching and managing backtest results.
 * This service would interact with a backend system responsible for running
 * backtests (likely using Lumibot or a similar engine) and storing/retrieving the results.
 */

import type { PerformanceDataPoint } from './monitoring-service'; // Reuse type for equity curve
import { format } from "date-fns"; // Import date-fns for date formatting

export interface BacktestSummaryMetrics {
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number; // As a decimal, e.g., 0.15 for 15%
  winRate: number; // As a decimal, e.g., 0.65 for 65%
  totalTrades: number;
  avgTradePnl: number;
  startDate?: string; // Optional: Date backtest started (YYYY-MM-DD)
  endDate?: string; // Optional: Date backtest ended (YYYY-MM-DD)
  sharpeRatio?: number; // Optional: Add more metrics as available
  sortinoRatio?: number; // Optional
  symbol?: string; // Asset/Symbol tested
  timeframe?: string; // Timeframe used (e.g., '1d', '1h')
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

type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// --- Mock Data & State ---
// In-memory store for mock job statuses
const mockJobStatuses: Record<string, JobStatus> = {};
const mockJobTimeouts: Record<string, NodeJS.Timeout> = {};


// TODO: Replace with actual data fetching from your backend/database.
// This mock data should ideally be keyed by strategy ID AND potentially parameters used.
// For simplicity, we'll key by strategy ID for now and assume it returns the *latest* result.
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
            symbol: 'AAPL', // Added symbol
            timeframe: '1d', // Added timeframe
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
            { entryTimestamp: '2023-01-15T11:00:00Z', exitTimestamp: '2023-01-16T09:45:00Z', symbol: 'AAPL', direction: 'Long', entryPrice: 131.00, exitPrice: 129.50, quantity: 10, pnl: -15.00 },
            // ... more trades
        ],
        parameters: { short_ema: 10, long_ema: 25, symbol: 'AAPL', timeframe: '1d' } // Reflect backtest params
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
            symbol: 'GOOGL', // Added symbol
            timeframe: '4h', // Added timeframe
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
        parameters: { model_version: 'v2.1', confidence_threshold: 0.7, symbol: 'GOOGL', timeframe: '4h' }
    },
     'strat-002': { // Example for a strategy with poor results - WILL BE OVERWRITTEN by successful AAPL test
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
             symbol: 'MSFT', // Added symbol
             timeframe: '1h', // Added timeframe
         },
         equityCurve: [
              { date: '2023-01-01', portfolioValue: 10000, profit: 0 },
              { date: '2023-03-01', portfolioValue: 9800, profit: -200 },
              { date: '2023-06-01', portfolioValue: 10100, profit: 100 },
              { date: '2023-09-01', portfolioValue: 9500, profit: -500 },
              { date: '2023-12-31', portfolioValue: 9659.90, profit: -340.10 },
         ],
         trades: [],
         parameters: { period: 14, std_dev: 2.0, symbol: 'MSFT', timeframe: '1h' }
     },
};

// Simulate potential API/DB errors
const simulateError = (probability = 0.1): void => {
    if (Math.random() < probability) {
        console.warn(`Simulating a service error (probability: ${probability})`);
        throw new Error("Simulated backtesting service error.");
    }
}

/**
 * Generates a mock equity curve for a given period.
 */
const generateMockEquityCurve = (startDateStr: string, endDateStr: string, initialCapital: number): PerformanceDataPoint[] => {
    const curve: PerformanceDataPoint[] = [];
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    let currentDate = new Date(startDate);
    let currentValue = initialCapital;
    let currentProfit = 0;

    while (currentDate <= endDate) {
        // Simulate daily change
        const dailyChangePercent = (Math.random() - 0.45) * 0.02; // Small daily fluctuation +/-
        const dailyPnl = currentValue * dailyChangePercent;
        currentValue += dailyPnl;
        currentProfit += dailyPnl;

        curve.push({
            date: format(currentDate, "yyyy-MM-dd"),
            portfolioValue: Math.max(0, currentValue), // Ensure value doesn't go below 0
            profit: currentProfit,
        });

        // Move to the next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Ensure the last point is exactly the end date
    if (curve[curve.length - 1].date !== endDateStr) {
         curve.push({
             date: endDateStr,
             portfolioValue: Math.max(0, currentValue),
             profit: currentProfit
         });
    }


    return curve;
}


/**
 * Fetches the latest backtest results for a given strategy.
 * In a real system, this might fetch based on strategyId AND the specific parameters used.
 * For this mock, it just returns the pre-defined result for the strategyId.
 * TODO: Replace with actual data fetching logic.
 * @param strategyId The ID of the strategy.
 * @returns A promise that resolves to the BacktestResults object.
 * @throws Throws an error if the backtest results are not found or if fetching fails.
 */
export async function getBacktestResults(strategyId: string): Promise<BacktestResults> {
    console.log(`SERVICE: Fetching backtest results for strategy: ${strategyId}`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));

    // Do NOT simulate error here - let the calling component handle missing data
    // simulateError(0.1);

    const results = mockBacktestDb[strategyId];

    if (!results) {
        console.warn(`SERVICE: No backtest results found for strategy ${strategyId}.`);
        throw new Error(`No backtest results available for strategy "${strategyId}". Please run a backtest first.`);
    }

    console.log(`SERVICE: Returning backtest results for ${strategyId}`);
    return results;
}

/**
 * Triggers a new backtest run for a strategy with specific parameters.
 * TODO: Implement the backend logic to queue or start a backtest process.
 * This function would likely send a request to your backend API.
 * @param strategyId The ID of the strategy to backtest.
 * @param parameters Parameters for the backtest (e.g., dates, capital, symbol, timeframe).
 * @returns A promise that resolves when the backtest is successfully queued (e.g., returns a job ID).
 */
export async function runBacktest(strategyId: string, parameters: {
    startDate: string; // Expecting 'YYYY-MM-DD' format
    endDate: string;   // Expecting 'YYYY-MM-DD' format
    initialCapital: number;
    symbol: string;
    timeframe: string; // e.g., '1d', '1h'
    // Add other potential parameters like leverage, specific strategy params overrides, etc.
}): Promise<{ jobId: string }> {
    console.log(`SERVICE: Requesting backtest run for strategy: ${strategyId} with params:`, parameters);
    // Simulate API call to backend to trigger the backtest
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 200)); // Reduced delay

    // --- Backend actions needed here: ---
    // 1. Validate strategyId and parameters.
    // 2. Find the strategy code (e.g., path to the .py file associated with strategyId).
    // 3. Queue a job in a task queue (like Celery, RQ, BullMQ) or directly invoke the backtesting engine.
    // 4. Pass the strategy code path and *all relevant parameters* (dates, capital, symbol, timeframe, etc.) to the job.
    // 5. The job runner would execute Lumibot (or similar).
    // 6. Upon completion, the job runner saves the results (summary, equity curve, trades, *parameters used*) to the database/store, possibly associated with the job ID and strategy ID. Also update job status.
    // 7. Optionally update the strategy status (e.g., 'Backtesting').
    // -------------------------------------

    const jobId = `backtest-${strategyId}-${Date.now().toString().slice(-6)}`;
    console.log(`SERVICE: Backtest job queued/started for ${strategyId}. Job ID: ${jobId}`);

    // Simulate triggering the job - set status to RUNNING immediately
    mockJobStatuses[jobId] = 'RUNNING';
    // Clear any previous timeout for this job ID
    if (mockJobTimeouts[jobId]) {
        clearTimeout(mockJobTimeouts[jobId]);
    }

    // --- Mock: Simulate job completion and result population ---
    const backtestDuration = 5000 + Math.random() * 3000; // Simulate backtest duration (5-8 seconds for testing)
    mockJobTimeouts[jobId] = setTimeout(() => {
        // FORCE SUCCESS FOR AAPL FOR TESTING
        const shouldFail = parameters.symbol !== 'AAPL' && Math.random() < 0.3; // 30% chance of failure for non-AAPL
        let baseResult = mockBacktestDb[strategyId];

         if (!baseResult) {
             // If no base result exists, create a placeholder
             baseResult = {
                 strategyId: strategyId,
                 timestamp: new Date().toISOString(),
                 summaryMetrics: {
                     netProfit: 0, profitFactor: 1, maxDrawdown: 0, winRate: 0.5, totalTrades: 0, avgTradePnl: 0
                 },
                 equityCurve: [],
                 trades: [],
             };
             console.warn(`SERVICE: No base mock result for ${strategyId}, created placeholder.`);
         }


        if (!shouldFail) {
            // Generate a mock equity curve for the requested period
            const equityCurve = generateMockEquityCurve(parameters.startDate, parameters.endDate, parameters.initialCapital);
            const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].portfolioValue : parameters.initialCapital;
            const netProfit = finalEquity - parameters.initialCapital;
            const totalTrades = Math.floor(Math.random() * 50) + 5; // Random trades (5-55)
            const winRate = 0.4 + Math.random() * 0.35; // Random win rate (40-75%)
            const profitFactor = Math.max(0.5, 1 + (Math.random() - 0.5) * 1.5); // Random profit factor around 1 (min 0.5)
            const maxDrawdown = Math.random() * 0.25 + 0.05; // Random drawdown (5-30%)

             // Update/overwrite the mock result in the DB simulation
             mockBacktestDb[strategyId] = {
                 ...baseResult,
                 timestamp: new Date().toISOString(),
                 parameters: { ...baseResult.parameters, ...parameters }, // Include run parameters
                 equityCurve: equityCurve,
                 summaryMetrics: {
                     // Use newly generated mock metrics
                     netProfit: parseFloat(netProfit.toFixed(2)),
                     profitFactor: parseFloat(profitFactor.toFixed(2)),
                     maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
                     winRate: parseFloat(winRate.toFixed(2)),
                     totalTrades: totalTrades,
                     avgTradePnl: totalTrades > 0 ? parseFloat((netProfit / totalTrades).toFixed(2)) : 0,
                     // Keep dates/symbol/timeframe from parameters
                     startDate: parameters.startDate,
                     endDate: parameters.endDate,
                     symbol: parameters.symbol,
                     timeframe: parameters.timeframe,
                     // Add other metrics if needed (can be random/fixed for mock)
                     sharpeRatio: parseFloat((Math.random() * 2 - 0.5).toFixed(2)), // Random Sharpe
                 },
                 // Could also generate mock trades if needed
                 trades: [
                      { entryTimestamp: parameters.startDate + 'T10:00:00Z', exitTimestamp: parameters.startDate + 'T15:30:00Z', symbol: parameters.symbol, direction: 'Long', entryPrice: 130.50 * (0.9 + Math.random()*0.2), exitPrice: 131.80 * (0.9 + Math.random()*0.2), quantity: 10, pnl: 13.00 * (0.9 + Math.random()*0.2) },
                 ],
             };
             mockJobStatuses[jobId] = 'COMPLETED';
             console.log(`SERVICE: Mock backtest job ${jobId} completed successfully and results updated for ${strategyId} with symbol ${parameters.symbol}.`);
        } else {
            mockJobStatuses[jobId] = 'FAILED';
            console.error(`SERVICE: Mock backtest job ${jobId} marked as FAILED for strategy ${strategyId}.`);
             // Optionally add error info to the results?
             mockBacktestDb[strategyId] = {
                 ...baseResult,
                 timestamp: new Date().toISOString(),
                 parameters: { ...baseResult.parameters, ...parameters },
                 summaryMetrics: { // Reset metrics on failure?
                    netProfit: 0, profitFactor: 0, maxDrawdown: 0, winRate: 0, totalTrades: 0, avgTradePnl: 0,
                    startDate: parameters.startDate, endDate: parameters.endDate, symbol: parameters.symbol, timeframe: parameters.timeframe,
                 },
                 equityCurve: [], // Clear curve on failure
                 trades: [], // Clear trades on failure
                 logOutput: "Simulated backtest failure: Could not load historical data.", // Add mock error log
             };
        }
        delete mockJobTimeouts[jobId]; // Clean up timeout reference
    }, backtestDuration);
    // --------------------------------------------------------

    try {
        simulateError(0.05); // Low chance of error during the initial queueing itself
    } catch (err) {
         console.error(`SERVICE: Error during immediate queueing of job ${jobId}:`, err);
         mockJobStatuses[jobId] = 'FAILED'; // Mark as failed if queueing fails
         if (mockJobTimeouts[jobId]) clearTimeout(mockJobTimeouts[jobId]); // Clear timeout
         delete mockJobTimeouts[jobId];
         throw err; // Re-throw the error
    }


    return { jobId }; // Return the simulated job ID immediately
}

/**
 * Fetches the status of a specific backtest job.
 * TODO: Implement backend logic to check job status from the task queue or job store.
 * @param jobId The ID of the backtest job.
 * @returns A promise resolving to the job status ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED').
 */
export async function getBacktestJobStatus(jobId: string): Promise<JobStatus> {
     // console.log(`SERVICE: Checking status for backtest job: ${jobId}`); // Less noisy logging
     await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 100)); // Faster status check

     // Do not simulate error here, let polling handle transient issues if needed
     // simulateError(0.05);

     // --- Mock Status Logic ---
     // Use the in-memory mockJobStatuses store. Default to PENDING if not found.
     const status = mockJobStatuses[jobId] || 'PENDING';
     // console.log(`SERVICE: Mock status for job ${jobId}: ${status}`); // Less noisy logging
     return status;
     // -----------------------
}

