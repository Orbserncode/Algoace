// src/services/monitoring-service.ts

/**
 * @fileOverview Service functions for fetching monitoring data.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or API).
 */

export interface PerformanceDataPoint {
  date: string; // Consider using Date objects if more manipulation is needed
  portfolioValue: number;
  profit: number; // Cumulative profit up to this point
}

export interface LogEntry {
  timestamp: string; // Consider using Date objects
  type: 'Trade' | 'Signal' | 'System' | 'Error';
  message: string;
  strategy?: string; // Strategy ID or name, 'System' for non-strategy logs
}

export interface KeyMetrics {
    totalPnL: number;
    todayPnL: number;
    activeStrategies: number;
    totalTradesToday: number;
    winRateLast7d: number; // Percentage
    maxDrawdown: number; // Percentage
}

// Define a detailed Trade type
export interface Trade {
  id: string; // Unique ID for the trade
  timestamp: string; // Execution timestamp
  strategyId: string; // ID of the strategy that executed the trade
  strategyName?: string; // Optional: Name of the strategy
  symbol: string;
  tradeType: 'BUY' | 'SELL';
  tradingMethod: 'Spot' | 'Futures' | 'Options'; // Based on allowedTradingMethods
  assetType: 'Stock' | 'Crypto' | 'Forex' | 'ETF'; // Based on allowedAssetTypes
  category?: string; // Optional category/sector
  lotSize: number; // Quantity or contracts
  entryPrice: number;
  exitPrice?: number; // Nullable if position is still open
  pnl?: number; // Nullable if position is still open
  // Add other relevant fields like fees, slippage, duration, etc.
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
  { date: '2024-08-19', portfolioValue: 11350, profit: 1350 },
  { date: '2024-08-26', portfolioValue: 11200, profit: 1200 },
];

const mockLogData: LogEntry[] = [
  { timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), type: 'Trade', message: 'Executed BUY NVDA @ 125.50, Size: 10', strategy: 'strat-001' }, // Include size
  { timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), type: 'Signal', message: 'Potential entry signal for AMD', strategy: 'strat-003' },
  { timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), type: 'Error', message: 'Failed to connect to data provider. Retrying...', strategy: 'System' },
  { timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), type: 'System', message: 'Risk check passed for all active strategies.', strategy: 'agent-risk-default' }, // Use agent ID/name
  { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: 'Trade', message: 'Executed SELL AAPL @ 210.80, Size: 5', strategy: 'strat-003' },
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

// Mock Trade Data keyed by strategyId
const mockTradeDatabase: Record<string, Trade[]> = {
    'strat-001': [ // Momentum Burst Trades
        { id: 't101', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), strategyId: 'strat-001', strategyName: 'Momentum Burst', symbol: 'NVDA', tradeType: 'BUY', tradingMethod: 'Spot', assetType: 'Stock', category: 'Tech', lotSize: 10, entryPrice: 125.50, exitPrice: 128.00, pnl: 25.00 },
        { id: 't102', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), strategyId: 'strat-001', strategyName: 'Momentum Burst', symbol: 'TSLA', tradeType: 'BUY', tradingMethod: 'Spot', assetType: 'Stock', category: 'Auto', lotSize: 5, entryPrice: 180.00, exitPrice: 175.00, pnl: -25.00 },
        { id: 't103', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), strategyId: 'strat-001', strategyName: 'Momentum Burst', symbol: 'MSFT', tradeType: 'SELL', tradingMethod: 'Spot', assetType: 'Stock', category: 'Tech', lotSize: 8, entryPrice: 450.00, exitPrice: 448.00, pnl: 16.00 },
    ],
    'strat-003': [ // AI Trend Follower Trades
        { id: 't301', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), strategyId: 'strat-003', strategyName: 'AI Trend Follower', symbol: 'AAPL', tradeType: 'SELL', tradingMethod: 'Spot', assetType: 'Stock', category: 'Tech', lotSize: 5, entryPrice: 210.80, exitPrice: 209.00, pnl: 9.00 },
        { id: 't302', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), strategyId: 'strat-003', strategyName: 'AI Trend Follower', symbol: 'GOOGL', tradeType: 'BUY', tradingMethod: 'Spot', assetType: 'Stock', category: 'Tech', lotSize: 10, entryPrice: 175.00, exitPrice: 178.50, pnl: 35.00 },
        { id: 't303', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), strategyId: 'strat-003', strategyName: 'AI Trend Follower', symbol: 'BTC/USD', tradeType: 'BUY', tradingMethod: 'Spot', assetType: 'Crypto', lotSize: 0.05, entryPrice: 65000, exitPrice: 66500, pnl: 75.00 },
    ],
     // Add mock trades for other strategies as needed
     'strat-002': [], // No recent trades for inactive strategy
     'strat-004': [], // No trades for debugging strategy
     'strat-005': [], // No trades for archived strategy
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


// --- Strategy Specific Monitoring ---

/**
 * Fetches the performance history specifically for a given strategy.
 * TODO: Replace with actual data fetching logic.
 * @param strategyId The ID of the strategy.
 * @param timeRange The time range for the data.
 * @returns A promise resolving to an array of PerformanceDataPoint objects for the strategy.
 */
export async function getStrategyPerformance(strategyId: string, timeRange: string = '1M'): Promise<PerformanceDataPoint[]> {
     console.log(`Fetching performance for strategy: ${strategyId}, range: ${timeRange}`);
     await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

     // Mock: Generate some strategy-specific performance based on its base PnL
     const basePnl = mockTradeDatabase[strategyId]?.reduce((sum, trade) => sum + (trade.pnl || 0), 0) || 0;
     const baseValue = 10000; // Assume a starting point for simulation

     const performance: PerformanceDataPoint[] = [];
     let currentValue = baseValue;
     let currentProfit = 0;
     const days = timeRange === '7D' ? 7 : timeRange === '1D' ? 1 : 30; // Simple range mapping
     const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

     for (let i = 0; i <= days; i++) {
         const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
         // Simulate some daily fluctuation related to the strategy's overall PnL trend
         const dailyChange = (basePnl / 10000) * (Math.random() * 50 + 10); // Fluctuate based on overall trend
         const noise = (Math.random() - 0.5) * 50; // Add noise
         const change = dailyChange + noise;

         currentValue += change;
         currentProfit += change;
         performance.push({
             date: date.toISOString().split('T')[0],
             portfolioValue: Math.max(baseValue * 0.8, currentValue), // Add floor
             profit: currentProfit,
         });
     }

     return performance;
}

/**
 * Fetches the recent trades executed by a specific strategy.
 * TODO: Replace with actual data fetching logic from a trades database table.
 * @param strategyId The ID of the strategy.
 * @param limit The maximum number of trades to return. Defaults to 100.
 * @param offset The number of trades to skip (for pagination). Defaults to 0.
 * @returns A promise resolving to an object containing the trades and total count.
 */
export async function getStrategyTrades(strategyId: string, limit: number = 100, offset: number = 0): Promise<{ trades: Trade[], total: number }> {
    console.log(`Fetching trades for strategy: ${strategyId}, limit: ${limit}, offset: ${offset}`);
    await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 200));

    // Mock: Return trades from the mock database
    const allTrades = mockTradeDatabase[strategyId] || [];
    const paginatedTrades = allTrades
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) // Sort descending by time
        .slice(offset, offset + limit);

    return {
        trades: paginatedTrades,
        total: allTrades.length,
    };
}

    