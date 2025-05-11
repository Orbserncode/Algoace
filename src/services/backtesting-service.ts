// src/services/backtesting-service.ts

/**
 * @fileOverview Service functions for fetching and managing backtest results.
 * This service would interact with a backend system responsible for running
 * backtests (likely using Lumibot or a similar engine) and storing/retrieving the results.
 */

import type { PerformanceDataPoint } from './monitoring-service'; // Reuse type for equity curve
import { format } from "date-fns"; // Import date-fns for date formatting

// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';

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
    
    try {
        const response = await fetch(`${API_BASE_URL}/backtesting/results/${strategyId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`No backtest results available for strategy "${strategyId}". Please run a backtest first.`);
            }
            throw new Error(`Error fetching backtest results: ${response.statusText}`);
        }
        
        const results = await response.json();
        console.log(`SERVICE: Returning backtest results for ${strategyId}`);
        return results;
    } catch (error) {
        console.error(`SERVICE: Error fetching backtest results for ${strategyId}:`, error);
        throw error;
    }
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
    
    // Check if dataset exists for the requested symbol and timeframe
    const datasetCheck = await checkDatasetAvailability(parameters.symbol, parameters.timeframe);
    
    if (!datasetCheck.available) {
        throw new Error(`No dataset available for ${parameters.symbol} with timeframe ${parameters.timeframe}. Please download the data first.`);
    }
    
    console.log(`Found ${datasetCheck.count} datasets for ${parameters.symbol} with timeframe ${parameters.timeframe}`);

    // --- Backend actions needed here: ---
    // 1. Validate strategyId and parameters.
    // 2. Find the strategy code (e.g., path to the .py file associated with strategyId).
    // 3. Queue a job in a task queue (like Celery, RQ, BullMQ) or directly invoke the backtesting engine.
    // 4. Pass the strategy code path and *all relevant parameters* (dates, capital, symbol, timeframe, etc.) to the job.
    // 5. The job runner would execute Lumibot (or similar).
    // 6. Upon completion, the job runner saves the results (summary, equity curve, trades, *parameters used*) to the database/store, possibly associated with the job ID and strategy ID. Also update job status.
    // 7. Optionally update the strategy status (e.g., 'Backtesting').
    // -------------------------------------

    try {
        // Send the backtest request to the API
        const response = await fetch(`${API_BASE_URL}/backtesting/run`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                strategy_id: strategyId,
                parameters: parameters
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Error starting backtest: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`SERVICE: Backtest job queued/started for ${strategyId}. Job ID: ${result.jobId}`);
        return { jobId: result.jobId };
    } catch (error) {
        console.error(`SERVICE: Error starting backtest for ${strategyId}:`, error);
        throw error;
    }
}

/**
 * Fetches the status of a specific backtest job.
 * TODO: Implement backend logic to check job status from the task queue or job store.
 * @param jobId The ID of the backtest job.
 * @returns A promise resolving to the job status ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED').
 */
export async function getBacktestJobStatus(jobId: string): Promise<JobStatus> {
    try {
        const response = await fetch(`${API_BASE_URL}/backtesting/jobs/${jobId}/status`);
        
        if (!response.ok) {
            throw new Error(`Error fetching job status: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.status as JobStatus;
    } catch (error) {
        console.error(`SERVICE: Error checking status for job ${jobId}:`, error);
        throw error;
    }
}

/**
 * Checks if a dataset is available for the given symbol and timeframe.
 * In a real implementation, this would query the datasets API.
 * @param symbol The trading symbol (e.g., 'AAPL', 'BTC/USD')
 * @param timeframe The timeframe (e.g., '1d', '1h', '15m')
 * @returns A promise resolving to an object with available status and count
 */
export async function checkDatasetAvailability(symbol: string, timeframe: string): Promise<{
    available: boolean,
    count: number,
    start_date?: string,
    end_date?: string,
    has_date_range: boolean
}> {
    console.log(`SERVICE: Checking dataset availability for ${symbol} (${timeframe})`);
    
    try {
        // Query the datasets API to check if a dataset exists for this symbol and timeframe
        const response = await fetch(`${API_BASE_URL}/datasets/check?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
        
        if (!response.ok) {
            throw new Error(`Error checking dataset availability: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`Found ${result.count} datasets for ${symbol} with timeframe ${timeframe}`);
        
        return {
            available: result.available,
            count: result.count || 0,
            start_date: result.start_date,
            end_date: result.end_date,
            has_date_range: result.has_date_range || false
        };
    } catch (error) {
        console.error(`SERVICE: Error checking dataset availability:`, error);
        return {
            available: false,
            count: 0,
            has_date_range: false
        };
    }
}

/**
 * Downloads market data for a specific symbol and timeframe.
 * In a real implementation, this would connect to the broker API.
 * @param symbol The trading symbol (e.g., 'AAPL', 'BTC/USD')
 * @param timeframe The timeframe (e.g., '1d', '1h', '15m')
 * @param startDate The start date for the data
 * @param endDate The end date for the data
 * @returns A promise resolving to true if the download was successful
 */
export async function downloadMarketData(
    symbol: string,
    timeframe: string,
    startDate: string,
    endDate: string
): Promise<boolean> {
    console.log(`SERVICE: Downloading market data for ${symbol} (${timeframe}) from ${startDate} to ${endDate}`);
    
    try {
        // First check if the dataset already exists
        const datasetCheck = await checkDatasetAvailability(symbol, timeframe);
        
        if (datasetCheck.available) {
            console.log(`SERVICE: Dataset for ${symbol} (${timeframe}) already exists. No need to download.`);
            return true;
        }
        
        // Make an API call to the backend to download the data
        const response = await fetch(`${API_BASE_URL}/datasets/download`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                symbol,
                timeframe,
                startDate,
                endDate
            }),
        });
        
        if (!response.ok) {
            throw new Error(`Failed to download data: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`SERVICE: Successfully downloaded data for ${symbol}`);
        return true;
    } catch (error) {
        console.error(`SERVICE: Error downloading market data:`, error);
        throw error;
    }
}

/**
 * Interface for backtest history items returned from the API
 */
export interface BacktestHistoryItem {
  id: number;
  strategy_id: string;
  timestamp: string;
  parameters: any;
  summary_metrics: any;
  has_ai_analysis: boolean;
}

/**
 * Fetches the list of backtest history items
 * @param strategyId Optional strategy ID to filter results
 * @returns A promise that resolves to an array of BacktestHistoryItem objects
 */
export async function fetchBacktestHistoryList(strategyId?: string): Promise<BacktestHistoryItem[]> {
  console.log(`SERVICE: Fetching backtest history list${strategyId ? ` for strategy: ${strategyId}` : ''}`);
  
  try {
    const url = strategyId
      ? `${API_BASE_URL}/backtest-history?strategy_id=${encodeURIComponent(strategyId)}`
      : `${API_BASE_URL}/backtest-history`;
      
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error fetching backtest history: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`SERVICE: Returning ${data.length} backtest history items`);
    return data;
  } catch (error) {
    console.error(`SERVICE: Error fetching backtest history:`, error);
    throw error;
  }
}

/**
 * Saves the current backtest results to the history
 * @param strategyId The ID of the strategy
 * @param results The backtest results to save
 * @returns A promise that resolves to the saved backtest history item
 */
export async function saveBacktestResults(strategyId: string, results: BacktestResults): Promise<BacktestHistoryItem> {
  console.log(`SERVICE: Saving backtest results for strategy: ${strategyId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/backtest-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy_id: strategyId,
        parameters: results.parameters || {},
        summary_metrics: results.summaryMetrics,
        equity_curve: results.equityCurve,
        trades: results.trades,
        log_output: results.logOutput || ''
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error saving backtest results: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`SERVICE: Backtest results saved successfully with ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error(`SERVICE: Error saving backtest results:`, error);
    throw error;
  }
}

