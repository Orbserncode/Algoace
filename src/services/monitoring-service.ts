// src/services/monitoring-service.ts

/**
 * @fileOverview Service functions for fetching monitoring data.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or API).
 */

export interface PerformanceDataPoint {
  date: string; // Consider using Date objects if more manipulation is needed
  portfolioValue: number;
  profit: number;
}

export interface LogEntry {
  timestamp: string; // Consider using Date objects
  type: 'Trade' | 'Signal' | 'System' | 'Error';
  message: string;
  strategy: string; // Could be 'System' for non-strategy specific logs
}

export interface KeyMetrics {
    totalPnL: number;
    todayPnL: number;
    activeStrategies: number;
    totalTradesToday: number;
    winRateLast7d: number; // Percentage
    maxDrawdown: number; // Percentage
}

// --- Mock Data ---
// TODO: Replace with actual data fetching from your backend/database/APIs

const mockPerformanceData: PerformanceDataPoint[] = [
  { date: '2024-07-01', portfolioValue: 10000, profit: 0 },
  { date: '2024-07-08', portfolioValue: 10250, profit: 250 },
  { date: '2024-07-15', portfolioValue: 10150, profit: 150 },
  { date: '2024-07-22', portfolioValue: 10500, profit: 500 },
  { date: '2024-07-29', portfolioValue: 10800, profit: 800 },
  { date: '2024-08-05', portfolioValue: 10700, profit: 700 },
  { date: '2024-08-12', portfolioValue: 11100, profit: 1100 },
   // Add more realistic data points
  { date: '2024-08-19', portfolioValue: 11350, profit: 1350 },
  { date: '2024-08-26', portfolioValue: 11200, profit: 1200 },
];

const mockLogData: LogEntry[] = [
  { timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), type: 'Trade', message: 'Executed BUY NVDA @ 125.50', strategy: 'Momentum Burst' },
  { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), type: 'Signal', message: 'Potential entry signal for AMD', strategy: 'AI Trend Follower' },
  { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), type: 'Error', message: 'Failed to connect to data provider. Retrying...', strategy: 'System' },
  { timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), type: 'System', message: 'Risk check passed for all active strategies.', strategy: 'Risk Management Agent' },
  { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: 'Trade', message: 'Executed SELL AAPL @ 210.80', strategy: 'AI Trend Follower' },
  { timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), type: 'System', message: 'Market data connection established.', strategy: 'System' },
];

const mockKeyMetrics: KeyMetrics = {
    totalPnL: 1200.00, // Based on last mockPerformanceData point profit
    todayPnL: -75.50, // Example dynamic value
    activeStrategies: 3, // Example dynamic value
    totalTradesToday: 8, // Example dynamic value
    winRateLast7d: 71.2,
    maxDrawdown: 9.5,
};

// --- Service Functions ---

/**
 * Fetches portfolio performance history.
 * TODO: Replace with actual data fetching logic (e.g., query trade history and calculate daily/weekly values).
 * @param timeRange The time range for the data (e.g., '1D', '7D', '1M', 'YTD'). Defaults to '1M'.
 * @returns A promise that resolves to an array of PerformanceDataPoint objects.
 */
export async function getPortfolioHistory(timeRange: string = '1M'): Promise<PerformanceDataPoint[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 700));
  // Filter mock data based on timeRange (simplified example)
  // A real implementation would query the database with the appropriate date range
  console.log(`Fetching portfolio history for time range: ${timeRange}`); // Placeholder
  return mockPerformanceData; // Return all mock data for now
}

/**
 * Fetches recent activity logs.
 * TODO: Replace with actual data fetching logic (e.g., query logs table).
 * @param limit The maximum number of log entries to return. Defaults to 50.
 * @returns A promise that resolves to an array of LogEntry objects.
 */
export async function getActivityLogs(limit: number = 50): Promise<LogEntry[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 400));
  // In a real application, query your logging system or database
  return mockLogData.slice(0, limit); // Return mock data, respecting limit
}

/**
 * Fetches key performance metrics.
 * TODO: Replace with actual data fetching logic (e.g., calculate from trades, agent status).
 * @returns A promise that resolves to a KeyMetrics object.
 */
export async function getKeyMetrics(): Promise<KeyMetrics> {
  // Simulate API call delay and calculation
  await new Promise(resolve => setTimeout(resolve, 300));
  // In a real application, calculate these values from your data sources
  return mockKeyMetrics;
}
