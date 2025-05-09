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
  brokerName?: string; // Name of the broker
  pipsPnL?: number; // P&L in pips
  leverage?: number; // Leverage used for the trade
  isWinning?: boolean; // Whether the trade is currently winning
  // Add other relevant fields like fees, slippage, duration, etc.
}

// API base URL - use /api prefix to rely on Next.js rewrites
const API_BASE_URL = '/api';

// --- Service Functions ---

/**
 * Fetches portfolio performance history.
 * @param timeRange The time range for the data (e.g., '1D', '7D', '1M', 'YTD'). Defaults to '1M'.
 * @returns A promise that resolves to an array of PerformanceDataPoint objects.
 */
export async function getPortfolioHistory(timeRange: string = '1M'): Promise<PerformanceDataPoint[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/monitoring/performance?time_range=${timeRange}`);
    if (!response.ok) {
      throw new Error(`Error fetching portfolio history: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch portfolio history:', error);
    throw error;
  }
}

/**
 * Fetches recent activity logs.
 * @param limit The maximum number of log entries to return. Defaults to 50.
 * @returns A promise that resolves to an array of LogEntry objects.
 */
export async function getActivityLogs(limit: number = 50): Promise<LogEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/monitoring/logs?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Error fetching activity logs: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    throw error;
  }
}

/**
 * Fetches key performance metrics.
 * @returns A promise that resolves to a KeyMetrics object.
 */
export async function getKeyMetrics(): Promise<KeyMetrics> {
  console.log("Fetching key metrics...");
  
  try {
    // Fetch key metrics from the API
    const response = await fetch(`${API_BASE_URL}/monitoring/metrics`);
    
    if (!response.ok) {
      throw new Error(`Error fetching key metrics: ${response.statusText}`);
    }
    
    const metrics = await response.json();
    
    // If no metrics are returned, calculate them from trade data
    if (!metrics || Object.keys(metrics).length === 0) {
      console.log("No metrics found in database, calculating from trade data...");
      
      // Get all trades
      const trades = await getLiveBrokerTrades();
      const strategiesResponse = await fetch(`${API_BASE_URL}/strategies/`);
      const strategies: { id: string; name: string; status: string }[] = await strategiesResponse.json();
      
      // Calculate metrics
      const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate today's PnL
      const todayPnL = trades
        .filter(trade => new Date(trade.timestamp) >= today)
        .reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      
      // Count active strategies
      const activeStrategies = strategies.filter(s => s.status === 'Active').length;
      
      // Count today's trades
      const totalTradesToday = trades.filter(trade => new Date(trade.timestamp) >= today).length;
      
      // Calculate win rate for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const last7DaysTrades = trades.filter(trade => new Date(trade.timestamp) >= sevenDaysAgo);
      const winningTrades = last7DaysTrades.filter(trade => trade.isWinning).length;
      const winRateLast7d = last7DaysTrades.length > 0 ? winningTrades / last7DaysTrades.length : 0;
      
      // Calculate max drawdown (simplified)
      const maxDrawdown = 0.05; // Default to 5% if we can't calculate
      
      return {
        totalPnL,
        todayPnL,
        activeStrategies,
        totalTradesToday,
        winRateLast7d,
        maxDrawdown
      };
    }
    
    // Return metrics from the database
    return {
      totalPnL: metrics.total_pnl || 0,
      todayPnL: metrics.today_pnl || 0,
      activeStrategies: metrics.active_strategies || 0,
      totalTradesToday: metrics.total_trades_today || 0,
      winRateLast7d: metrics.win_rate_last_7d || 0,
      maxDrawdown: metrics.max_drawdown || 0
    };
  } catch (error) {
    console.error('Failed to fetch key metrics:', error);
    
    // Return default values if there's an error
    return {
      totalPnL: 0,
      todayPnL: 0,
      activeStrategies: 0,
      totalTradesToday: 0,
      winRateLast7d: 0,
      maxDrawdown: 0
    };
  }
}


// --- Strategy Specific Monitoring ---

/**
 * Fetches the performance history specifically for a given strategy.
 * @param strategyId The ID of the strategy.
 * @param timeRange The time range for the data.
 * @returns A promise resolving to an array of PerformanceDataPoint objects for the strategy.
 */
export async function getStrategyPerformance(strategyId: string, timeRange: string = '1M'): Promise<PerformanceDataPoint[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/monitoring/strategies/${strategyId}/performance?time_range=${timeRange}`);
    if (!response.ok) {
      throw new Error(`Error fetching strategy performance: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch performance for strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Fetches the recent trades executed by a specific strategy.
 * @param strategyId The ID of the strategy.
 * @param limit The maximum number of trades to return. Defaults to 100.
 * @param offset The number of trades to skip (for pagination). Defaults to 0.
 * @returns A promise resolving to an object containing the trades and total count.
 */
export async function getStrategyTrades(strategyId: string, limit: number = 100, offset: number = 0): Promise<{ trades: Trade[], total: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/monitoring/strategies/${strategyId}/trades?limit=${limit}&offset=${offset}`);
    if (!response.ok) {
      throw new Error(`Error fetching strategy trades: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch trades for strategy ${strategyId}:`, error);
    throw error;
  }
}

/**
 * Fetches the current open trades from the broker.
 * @param brokerId Optional broker ID to filter trades by broker
 * @returns A promise resolving to an array of Trade objects representing open positions
 */
export async function getLiveBrokerTrades(brokerId?: string): Promise<Trade[]> {
  try {
    const url = brokerId
      ? `${API_BASE_URL}/monitoring/broker/trades?broker_id=${brokerId}`
      : `${API_BASE_URL}/monitoring/broker/trades`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching live broker trades: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch live broker trades:', error);
    throw error;
  }
}

/**
 * Closes an open trade
 * @param tradeId The ID of the trade to close
 * @returns A promise that resolves to true if the trade was closed successfully
 */
export async function closeTrade(tradeId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/monitoring/trades/${tradeId}/close`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Error closing trade: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to close trade ${tradeId}:`, error);
    throw error; // Re-throw to allow handling in the UI
  }
}