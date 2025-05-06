// src/services/strategies-service.ts

/**
 * @fileOverview Service functions for fetching and managing trading strategies.
 * Replace mock implementations with actual data fetching logic (e.g., from a database or configuration files).
 * Backend Tech Stack: While not explicitly defined by the frontend code alone, a typical backend for this Next.js app could use Node.js (potentially with Express or Fastify), Python (with Flask/Django/FastAPI), or Go. The database could be PostgreSQL, MongoDB, or Firebase Firestore. The choice depends on specific requirements like performance, scalability, and team familiarity. The interaction with Lumibot suggests a Python backend might be involved for running strategies.
 */
import { SuggestStrategyConfigInput, SuggestStrategyConfigOutput } from '@/ai/flows/suggest-strategy-config'; // Ensure flow types are imported
import { suggestStrategyConfig as suggestStrategyConfigFlow } from '@/ai/flows/suggest-strategy-config'; // Import the actual flow function

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Debugging' | 'Backtesting' | 'Archived'; // Added 'Archived'
  pnl: number; // Consider fetching PnL dynamically or storing recent PnL
  winRate: number; // Similarly, fetch/calculate win rate
  // Add other relevant fields: parameters, associated agent ID, creation date, source (AI-gen/Uploaded), filename etc.
  source?: 'AI-Generated' | 'Uploaded';
  fileName?: string; // Store original filename if uploaded
}

// Mock data - replace with actual data source
// Use `let` to allow modification by add/update/delete functions
let mockStrategies: Strategy[] = [
  { id: 'strat-001', name: 'EMA Cross', description: 'Simple EMA crossover strategy.', status: 'Active', pnl: 1250.75, winRate: 65.2, source: 'Uploaded', fileName: 'ema_cross_strategy.py' },
  { id: 'strat-002', name: 'RSI Mean Reversion', description: 'Trades RSI extremes.', status: 'Inactive', pnl: -340.10, winRate: 48.9, source: 'Uploaded', fileName: 'rsi_mean_reversion.py' },
  { id: 'strat-003', name: 'AI Trend Follower V2', description: 'Uses ML to identify and follow trends (updated).', status: 'Active', pnl: 3105.00, winRate: 72.1, source: 'AI-Generated' },
  { id: 'strat-004', name: 'Bollinger Breakout', description: 'Trades breakouts of Bollinger Bands.', status: 'Debugging', pnl: 0, winRate: 0, source: 'Uploaded', fileName: 'bollinger_breakout.py' },
  { id: 'strat-005', name: 'Old Volatility Strategy', description: 'An older strategy no longer in use.', status: 'Archived', pnl: 50.15, winRate: 55.0, source: 'Uploaded', fileName: 'vol_breakout_old.py'}, // Example Archived
];

// Mock code content for viewer - replace with actual fetching if backend exists
const mockStrategyCode: Record<string, string> = {
    'strat-001': `
# filename: ema_cross_strategy.py
from lumibot.brokers import Alpaca
from lumibot.backtesting import YahooDataBacktesting
from lumibot.strategies.strategy import Strategy
from lumibot.traders import Trader
from datetime import datetime, timedelta
from lumibot.entities import Asset

class EmaCrossStrategy(Strategy):
    # === Parameters ===
    parameters = {
        "symbol": "SPY",
        "short_ema_period": 9,
        "long_ema_period": 21,
        "trade_quantity": 10,
        "cash_at_risk_limit": 0.1, # Max 10% of portfolio per trade
    }

    def initialize(self):
        # Set the timeframe for the strategy
        self.set_market("NYSE") # Or "NASDAQ", "CRYPTO", etc.
        self.sleeptime = "1D" # Run once per day

        # Get the strategy parameters
        self.symbol = self.parameters["symbol"]
        self.short_ema_period = self.parameters["short_ema_period"]
        self.long_ema_period = self.parameters["long_ema_period"]
        self.trade_quantity = self.parameters["trade_quantity"]
        self.cash_at_risk_limit = self.parameters["cash_at_risk_limit"]

        # Ensure the asset is trackable
        self.main_asset = Asset(symbol=self.symbol, asset_type="stock") # Adjust asset_type if needed


    def on_trading_iteration(self):
        self.log_message(f"Starting trading iteration for {self.symbol}")

        # Get historical data for calculating EMAs
        # Need long_ema_period + 1 days to calculate the long EMA correctly
        hist_data = self.get_historical_prices(self.main_asset, self.long_ema_period + 5, "day")
        if hist_data is None or hist_data.empty:
            self.log_message("Could not retrieve historical data.")
            return

        # Calculate EMAs
        try:
            short_ema = hist_data["close"].ewm(span=self.short_ema_period, adjust=False).mean()
            long_ema = hist_data["close"].ewm(span=self.long_ema_period, adjust=False).mean()
        except Exception as e:
            self.log_message(f"Error calculating EMAs: {e}")
            return

        # Get the latest values
        current_short_ema = short_ema.iloc[-1]
        previous_short_ema = short_ema.iloc[-2]
        current_long_ema = long_ema.iloc[-1]
        previous_long_ema = long_ema.iloc[-2]

        self.log_message(f"Short EMA: {current_short_ema:.2f}, Long EMA: {current_long_ema:.2f}")

        # Trading Logic
        # Check if we already have a position
        position = self.get_position(self.main_asset)
        last_price = self.get_last_price(self.main_asset)

        # Entry condition: Short EMA crosses above Long EMA
        if previous_short_ema <= previous_long_ema and current_short_ema > current_long_ema:
            if position is None or position.quantity <= 0: # If no position or short position (close short if any)
                if position and position.quantity < 0:
                    self.sell_all(asset=self.main_asset) # Close short position first
                    self.log_message("Closed existing short position.")
                # Calculate order quantity based on risk limit
                available_cash = self.portfolio_value * self.cash_at_risk_limit
                order_qty = int(available_cash / last_price)
                qty_to_buy = min(self.trade_quantity, order_qty) # Buy the lesser of fixed quantity or risk-based quantity

                if qty_to_buy > 0:
                    entry_order = self.create_order(self.main_asset, qty_to_buy, "buy", type="market")
                    self.submit_order(entry_order)
                    self.log_message(f"Submitted BUY order for {qty_to_buy} shares of {self.symbol}")
            else:
                 self.log_message("Buy signal triggered, but already long.")

        # Exit condition: Short EMA crosses below Long EMA
        elif previous_short_ema >= previous_long_ema and current_short_ema < current_long_ema:
            if position and position.quantity > 0: # If we have a long position
                self.sell_all(asset=self.main_asset)
                self.log_message(f"Submitted SELL order to close long position in {self.symbol}")
            else:
                 self.log_message("Sell signal triggered, but not long.")


    def on_order_fill(self, order, position, trade):
         self.log_message(f"Order filled: {order.side} {order.quantity} {order.symbol} @ {trade.price}")

    def on_bot_crash(self, error):
        self.log_message(f"Strategy crashed: {error}", level="error")
        # Potentially add code to liquidate positions on crash

# --- Backtesting ---
# if __name__ == "__main__":
#     # Define backtesting parameters
#     backtesting_start = datetime(2023, 1, 1)
#     backtesting_end = datetime(2023, 12, 31)
#     trading_fee = TradingFee(percent_fee=0.001) # Example 0.1% fee
#
#     # Run backtest
#     EmaCrossStrategy.backtest(
#         YahooDataBacktesting,
#         backtesting_start,
#         backtesting_end,
#         # parameters={"symbol": "AAPL", "short_ema_period": 10, "long_ema_period": 30}, # Example override
#         benchmark_asset="SPY",
#         buy_trading_fees=[trading_fee],
#         sell_trading_fees=[trading_fee],
#         show_trading_chart=True, # Optional: Display chart after backtest
#         show_tearsheet=True, # Optional: Show detailed performance metrics
#     )
`,
    'strat-002': `
# filename: rsi_mean_reversion.py
from lumibot.strategies.strategy import Strategy
from lumibot.entities import Asset, Order
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime
import pandas_ta as ta

class RsiMeanReversion(Strategy):
    parameters = {
        "symbol": "MSFT",
        "rsi_period": 14,
        "oversold_threshold": 30,
        "overbought_threshold": 70,
        "trade_quantity": 5,
        "stop_loss_percent": 0.02, # 2% stop loss
        "take_profit_percent": 0.04, # 4% take profit
    }

    def initialize(self):
        self.sleeptime = "1H" # Run hourly
        self.symbol = self.parameters["symbol"]
        self.rsi_period = self.parameters["rsi_period"]
        self.oversold_threshold = self.parameters["oversold_threshold"]
        self.overbought_threshold = self.parameters["overbought_threshold"]
        self.trade_quantity = self.parameters["trade_quantity"]
        self.stop_loss_percent = self.parameters["stop_loss_percent"]
        self.take_profit_percent = self.parameters["take_profit_percent"]
        self.main_asset = Asset(symbol=self.symbol, asset_type="stock")
        self.entry_price = None # Store entry price for SL/TP calculation

    def _calculate_rsi(self):
        """Helper function to calculate RSI."""
        # Need rsi_period + 1 bars for calculation
        hist = self.get_historical_prices(self.main_asset, self.rsi_period + 50, "hour") # Get more data for stability
        if hist is None or hist.empty:
            return None
        # Use pandas_ta to calculate RSI
        rsi = ta.rsi(hist["close"], length=self.rsi_period)
        if rsi is None or rsi.empty:
            return None
        return rsi.iloc[-1]

    def on_trading_iteration(self):
        rsi_value = self._calculate_rsi()
        if rsi_value is None:
            self.log_message("Could not calculate RSI.")
            return

        self.log_message(f"Current RSI for {self.symbol}: {rsi_value:.2f}")
        position = self.get_position(self.main_asset)
        last_price = self.get_last_price(self.main_asset)

        # --- Entry Logic ---
        if position is None: # No existing position
            if rsi_value < self.oversold_threshold:
                # Oversold -> Buy Signal
                self.log_message(f"RSI {rsi_value:.2f} < {self.oversold_threshold}. Triggering BUY.")
                stop_loss_price = last_price * (1 - self.stop_loss_percent)
                take_profit_price = last_price * (1 + self.take_profit_percent)
                buy_order = self.create_order(
                    asset=self.main_asset,
                    quantity=self.trade_quantity,
                    side="buy",
                    type="market",
                    stop_loss_price=stop_loss_price,
                    take_profit_price=take_profit_price,
                )
                self.submit_order(buy_order)
                self.entry_price = last_price # Store entry price approx

            elif rsi_value > self.overbought_threshold:
                # Overbought -> Sell Signal (Shorting example)
                # Note: Ensure your broker and account support shorting!
                # self.log_message(f"RSI {rsi_value:.2f} > {self.overbought_threshold}. Triggering SELL (Short).")
                # stop_loss_price = last_price * (1 + self.stop_loss_percent)
                # take_profit_price = last_price * (1 - self.take_profit_percent)
                # sell_order = self.create_order(
                #     asset=self.main_asset,
                #     quantity=self.trade_quantity,
                #     side="sell", # Short sell
                #     type="market",
                #     stop_loss_price=stop_loss_price,
                #     take_profit_price=take_profit_price,
                # )
                # self.submit_order(sell_order)
                # self.entry_price = last_price # Store entry price approx
                self.log_message("Sell signal triggered, but shorting is disabled in this example.")


        # --- Position Management (Example - simple RSI based exit) ---
        # In a real strategy, SL/TP orders should handle exits primarily.
        # This is a fallback or alternative exit logic.
        elif position and position.quantity > 0: # If long
            if rsi_value > self.overbought_threshold * 0.9: # Exit near overbought
                self.log_message(f"RSI {rsi_value:.2f} approaching overbought. Closing long position.")
                self.sell_all()
                self.entry_price = None
        # elif position and position.quantity < 0: # If short
        #     if rsi_value < self.oversold_threshold * 1.1: # Exit near oversold
        #         self.log_message(f"RSI {rsi_value:.2f} approaching oversold. Closing short position.")
        #         self.sell_all() # Buys back to close short
        #         self.entry_price = None

    def on_order_fill(self, order, position, trade):
         self.log_message(f"Order filled: {order.side} {order.quantity} {order.symbol} @ {trade.price}")
         # Reset entry price if position is closed
         new_position = self.get_position(self.main_asset)
         if new_position is None:
             self.entry_price = None

# --- Backtesting ---
# if __name__ == "__main__":
#     backtesting_start = datetime(2023, 6, 1)
#     backtesting_end = datetime(2023, 12, 31)
#
#     RsiMeanReversion.backtest(
#         YahooDataBacktesting,
#         backtesting_start,
#         backtesting_end,
#         parameters={"symbol": "AMD", "oversold_threshold": 25, "overbought_threshold": 75},
#         benchmark_asset="SPY",
#         show_tearsheet=True,
#     )
`,
    'strat-003': `
# filename: ai_trend_follower_v2.py
from lumibot.strategies.strategy import Strategy
from lumibot.entities import Asset
# import some_ml_library # Placeholder for actual ML library

class AITrendFollowerV2(Strategy):
    parameters = {
        "symbol": "GOOGL",
        "model_path": "./models/ai_trend_model_v2.1.pkl", # Path to a pre-trained model
        "confidence_threshold": 0.7,
        "trade_quantity": 8,
        "ai_update_interval_minutes": 240, # How often to re-evaluate AI signal (4 hours)
    }

    def initialize(self):
        self.sleeptime = "15M" # Check more frequently for execution, AI signal updates less often
        self.symbol = self.parameters["symbol"]
        self.main_asset = Asset(symbol=self.symbol, asset_type="stock")
        self.confidence_threshold = self.parameters["confidence_threshold"]
        self.trade_quantity = self.parameters["trade_quantity"]
        self.ai_update_interval_minutes = self.parameters["ai_update_interval_minutes"]
        self.last_ai_update_time = None
        self.current_ai_signal = None # e.g., "buy", "sell", "hold"

        # Load the ML model - Placeholder
        # try:
        #     self.model = some_ml_library.load_model(self.parameters["model_path"])
        #     self.log_message(f"AI model loaded from {self.parameters['model_path']}")
        # except Exception as e:
        #     self.log_message(f"Error loading AI model: {e}", level="error")
        #     self.model = None # Strategy might still run in a "hold" or "disabled" state

        self.log_message("AI Trend Follower V2 Initialized.")


    def _get_ai_prediction(self):
        # Placeholder: In a real scenario, this would fetch features, preprocess, and predict
        # For example, it might use recent price data, volume, news sentiment, etc.
        if self.model is None:
            return "hold", 0.0 # No model, no confidence

        # mock_features = self.get_some_features() # Your feature engineering
        # prediction, confidence = self.model.predict(mock_features)
        # For now, simulate a prediction
        rand = self.broker.api.random() # Use a pseudo-random number from broker if available, or just Math.random()
        if rand < 0.4:
            return "buy", rand + 0.5 # Confidence between 0.5 and 0.9
        elif rand < 0.8:
            return "sell", rand + 0.1 # Confidence between 0.1 and 0.9 (lower confidence for sell)
        else:
            return "hold", rand


    def on_trading_iteration(self):
        now = self.get_datetime()

        # Update AI signal periodically
        if self.last_ai_update_time is None or (now - self.last_ai_update_time).total_seconds() >= self.ai_update_interval_minutes * 60:
            self.log_message("Updating AI signal...")
            # signal, confidence = self._get_ai_prediction() # Placeholder call
            signal, confidence = "buy", 0.75 # Mocked signal
            self.log_message(f"New AI Signal: {signal}, Confidence: {confidence:.2f}")
            if confidence >= self.confidence_threshold:
                self.current_ai_signal = signal
            else:
                self.current_ai_signal = "hold" # Below threshold, hold
            self.last_ai_update_time = now

        if self.current_ai_signal is None:
            self.log_message("Waiting for initial AI signal.")
            return

        position = self.get_position(self.main_asset)

        if self.current_ai_signal == "buy":
            if position is None or position.quantity <= 0:
                if position and position.quantity < 0: self.sell_all() # Close short first
                self.log_message(f"AI Buy Signal. Attempting to buy {self.trade_quantity} {self.symbol}")
                order = self.create_order(self.main_asset, self.trade_quantity, "buy")
                self.submit_order(order)
        elif self.current_ai_signal == "sell":
            if position is None or position.quantity >= 0:
                 if position and position.quantity > 0: self.sell_all() # Close long first
                 # self.log_message(f"AI Sell Signal. Attempting to sell (short) {self.trade_quantity} {self.symbol}")
                 # order = self.create_order(self.main_asset, self.trade_quantity, "sell") # Short sell
                 # self.submit_order(order)
                 self.log_message("AI Sell signal (short) ignored in this example.")
        elif self.current_ai_signal == "hold":
            # Optional: Close existing positions if signal is hold and profit target met or small loss
            if position and position.unrealized_plpc > 0.03 : # Example: Take 3% profit on hold
                self.log_message("AI Hold Signal. Closing profitable position.")
                self.sell_all()
            elif position and position.unrealized_plpc < -0.015: # Example: Cut 1.5% loss on hold
                self.log_message("AI Hold Signal. Cutting losing position.")
                self.sell_all()
            else:
                self.log_message("AI Hold Signal. Maintaining current position or no position.")
`,
    'strat-004': `
# filename: bollinger_breakout.py
from lumibot.strategies.strategy import Strategy
from lumibot.entities import Asset
import pandas_ta as ta

class BollingerBreakout(Strategy):
    parameters = {
        "symbol": "AMD",
        "bb_period": 20,
        "bb_std_dev": 2.0,
        "trade_quantity": 15,
        "hold_duration_bars": 5, # How many bars to hold after a breakout
    }

    def initialize(self):
        self.sleeptime = "1H"
        self.symbol = self.parameters["symbol"]
        self.main_asset = Asset(symbol=self.symbol, asset_type="stock")
        self.bb_period = self.parameters["bb_period"]
        self.bb_std_dev = self.parameters["bb_std_dev"]
        self.trade_quantity = self.parameters["trade_quantity"]
        self.hold_duration_bars = self.parameters["hold_duration_bars"]
        self.bars_since_entry = 0
        self.active_trade_side = None # "buy" or "sell"

    def _calculate_bollinger_bands(self):
        hist = self.get_historical_prices(self.main_asset, self.bb_period + 5, "hour")
        if hist is None or hist.empty:
            return None, None, None
        
        # Columns from pandas_ta for Bollinger Bands are usually: BBL_period_std, BBM_period_std, BBU_period_std
        bbands = ta.bbands(hist["close"], length=self.bb_period, std=self.bb_std_dev)
        if bbands is None or bbands.empty:
            return None, None, None
        
        lower_band_col = f'BBL_{self.bb_period}_{self.bb_std_dev}'
        upper_band_col = f'BBU_{self.bb_period}_{self.bb_std_dev}'
        
        if lower_band_col not in bbands.columns or upper_band_col not in bbands.columns:
            self.log_message(f"Could not find Bollinger Bands columns in DataFrame: {bbands.columns}", level="error")
            # Fallback to generic names if specific ones not found (less reliable)
            if 'BBL' in bbands.columns and 'BBU' in bbands.columns:
                 lower_band_col, upper_band_col = 'BBL', 'BBU' # Generic, might be incorrect
            else:
                 return None, None, None


        return bbands[lower_band_col].iloc[-1], bbands[upper_band_col].iloc[-1], hist["close"].iloc[-1]


    def on_trading_iteration(self):
        position = self.get_position(self.main_asset)
        lower_band, upper_band, last_price = self._calculate_bollinger_bands()

        if lower_band is None or upper_band is None or last_price is None:
            self.log_message("Could not get Bollinger Bands or price.")
            return

        self.log_message(f"Price: {last_price:.2f}, Lower BB: {lower_band:.2f}, Upper BB: {upper_band:.2f}")

        # If holding a position, check for exit after duration
        if position:
            self.bars_since_entry += 1
            if self.bars_since_entry >= self.hold_duration_bars:
                self.log_message(f"Holding period of {self.hold_duration_bars} bars reached. Exiting trade.")
                self.sell_all()
                self.active_trade_side = None
                self.bars_since_entry = 0
            return # Don't look for new entries if holding

        # Entry Logic: Breakout
        if last_price > upper_band: # Breakout above upper band
            self.log_message("Price broke above upper Bollinger Band. Buying.")
            order = self.create_order(self.main_asset, self.trade_quantity, "buy")
            self.submit_order(order)
            self.active_trade_side = "buy"
            self.bars_since_entry = 0
        
        # Example for shorting on lower band breakout (ensure broker supports shorting)
        # elif last_price < lower_band: # Breakout below lower band
        #     self.log_message("Price broke below lower Bollinger Band. Selling (short).")
        #     order = self.create_order(self.main_asset, self.trade_quantity, "sell")
        #     self.submit_order(order)
        #     self.active_trade_side = "sell"
        #     self.bars_since_entry = 0
`,
     'strat-005': `# Archived Volatility Strategy - Placeholder
# filename: vol_breakout_old.py
from lumibot.strategies.strategy import Strategy
class VolatilityBreakout(Strategy):
     def initialize(self):
          self.symbol = "ETH/USD" # Example
          self.sleeptime = "1D"
          self.log_message("Initializing OLD Volatility Breakout for ETH/USD...")

     def on_trading_iteration(self):
          self.log_message("Old Volatility Breakout iteration - logic removed as archived.")
          # Old logic would go here
`,
};


// Simulate potential API/DB errors
const simulateError = (probability = 0.01) => { // Reduced error probability
    if (Math.random() < probability) {
        throw new Error("Simulated service error.");
    }
}

/**
 * Fetches the list of all trading strategies (excluding Archived by default).
 * TODO: Replace with actual data fetching logic (e.g., from database).
 * @param includeArchived Whether to include Archived strategies in the list. Defaults to false.
 * @returns A promise that resolves to an array of Strategy objects.
 */
export async function getStrategies(includeArchived: boolean = false): Promise<Strategy[]> {
  console.log(`Fetching strategies (includeArchived: ${includeArchived})...`);
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100)); // Faster
  simulateError(); 

  const filteredStrategies = includeArchived
    ? [...mockStrategies] // Return all if requested
    : mockStrategies.filter(s => s.status !== 'Archived'); // Exclude archived by default

  console.log("Fetched strategies:", filteredStrategies.length);
  // In a real app, filter in the database query
  return filteredStrategies;
}

/**
 * Fetches a single strategy by ID.
 * TODO: Replace with actual data fetching logic.
 * @param strategyId The ID of the strategy to fetch.
 * @returns A promise that resolves to the Strategy object or null if not found.
 */
export async function getStrategyById(strategyId: string): Promise<Strategy | null> {
    console.log(`Fetching strategy by ID: ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
    simulateError(); 
    const strategy = mockStrategies.find(s => s.id === strategyId);
    console.log(strategy ? `Found strategy: ${strategy.name}` : `Strategy ${strategyId} not found.`);
    return strategy || null;
}

/**
 * Fetches the code content for a given strategy ID (mock implementation).
 * In a real system, this would involve fetching the file content from storage
 * based on the strategy's fileName or database record.
 * @param strategyId The ID of the strategy.
 * @returns A promise resolving to the code string, or null if not found/applicable.
 */
export async function getStrategyCode(strategyId: string): Promise<string | null> {
    console.log(`Fetching code for strategy ID: ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
    simulateError();

    // In a real backend:
    // 1. Fetch strategy metadata from DB using strategyId.
    // 2. If it's an 'Uploaded' strategy with a fileName/path, read the file from storage (local, S3, GCS).
    // 3. If it's 'AI-Generated', potentially reconstruct/fetch from where the generated code is stored.
    // 4. Return the code content as a string.

    return mockStrategyCode[strategyId] || null; // Return mock code or null
}


/**
 * Adds a new strategy (typically AI-generated or manually defined without file).
 * TODO: Replace with actual data persistence logic.
 * @param newStrategyData Data for the new strategy (excluding ID, which should be generated).
 * @returns A promise that resolves to the newly created Strategy object.
 */
export async function addStrategy(newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'>): Promise<Strategy> {
    console.log("Adding new strategy:", newStrategyData.name);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
    simulateError(); 
    const newId = `strat-${String(Date.now()).slice(-4)}${Math.floor(Math.random() * 90 + 10)}`; // Slightly better unique ID
    const newStrategy: Strategy = {
        ...newStrategyData,
        id: newId,
        pnl: 0, // Initialize PnL
        winRate: 0, // Initialize win rate
        status: newStrategyData.status || 'Inactive', // Default status
        source: newStrategyData.source || 'AI-Generated', // Default source if not provided
    };
    mockStrategies.push(newStrategy);
    console.log("Added new strategy:", newStrategy.id, newStrategy.name);
    return newStrategy;
}

/**
 * Adds a new strategy from an uploaded file (mock implementation).
 * TODO: Requires backend implementation for file storage, validation (Lumibot compatibility), and processing.
 * @param newStrategyData Data including name, description, and original filename.
 * @returns A promise that resolves to the newly created Strategy object.
 */
export async function addStrategyWithFile(newStrategyData: {
    name: string;
    description: string;
    fileName: string;
    // status?: Strategy['status']; // Allow status override
    // fileContent?: string; // Could be sent if backend processes content directly
}): Promise<Strategy> {
    console.log("Adding new strategy from file:", newStrategyData.fileName);
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100)); // Simulate processing/DB save
    simulateError(); 

    // --- Backend actions needed here: ---
    // 1. Receive the file (e.g., via FormData).
    // 2. Validate the file (is it a .py? does it seem like Lumibot code? size check?).
    // 3. Store the file securely (e.g., S3, GCS, local disk).
    // 4. Save strategy metadata (name, description, file path/ID, status) to the database.
    // -------------------------------------

    const newId = `strat-up-${String(Date.now()).slice(-3)}${Math.floor(Math.random() * 90 + 10)}`;
    const newStrategy: Strategy = {
        id: newId,
        name: newStrategyData.name,
        description: newStrategyData.description,
        status: 'Inactive', // Uploaded strategies likely start inactive for review/backtesting
        pnl: 0,
        winRate: 0,
        source: 'Uploaded',
        fileName: newStrategyData.fileName,
    };
    mockStrategies.push(newStrategy);
    // Add mock code for the newly uploaded strategy if not already present (for demo purposes)
    if (!mockStrategyCode[newId]) {
        mockStrategyCode[newId] = `# Mock content for ${newStrategyData.fileName}\nprint("Strategy ${newStrategyData.name} initialized.")`;
    }
    console.log("Added new strategy from file:", newStrategy.id, newStrategy.name);
    return newStrategy;
}


/**
 * Updates an existing strategy (e.g., status, parameters).
 * TODO: Replace with actual data update logic.
 * @param strategyId The ID of the strategy to update.
 * @param updates Partial data containing the updates.
 * @returns A promise that resolves to the updated Strategy object or null if not found.
 */
export async function updateStrategy(strategyId: string, updates: Partial<Omit<Strategy, 'id'>>): Promise<Strategy | null> {
    console.log(`Updating strategy ${strategyId} with:`, updates);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
    simulateError(); 
    const index = mockStrategies.findIndex(s => s.id === strategyId);
    if (index === -1) {
        console.warn(`Strategy ${strategyId} not found for update.`);
        return null;
    }
    // Merge updates, ensuring not to overwrite the ID
    // Create a new object to ensure immutability for state updates
    const updatedStrategy = { ...mockStrategies[index], ...updates };
    mockStrategies[index] = updatedStrategy;
    console.log(`Updated strategy ${strategyId}:`, updatedStrategy);
    return updatedStrategy; // Return the new object
}

/**
 * Deletes a strategy permanently.
 * TODO: Replace with actual data deletion logic (including associated files if applicable).
 * @param strategyId The ID of the strategy to delete.
 * @returns A promise that resolves to true if deleted, false otherwise.
 */
export async function deleteStrategyPermanently(strategyId: string): Promise<boolean> {
    console.log(`Permanently deleting strategy ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 50));
    simulateError(); 

    // --- Backend actions needed here: ---
    // 1. Find strategy metadata in the database.
    // 2. If it's an 'Uploaded' strategy, delete the associated file from storage.
    // 3. Delete the strategy metadata record from the database.
    // -------------------------------------

    const initialLength = mockStrategies.length;
    mockStrategies = mockStrategies.filter(s => s.id !== strategyId);
    delete mockStrategyCode[strategyId]; // Remove mock code as well
    const deleted = mockStrategies.length < initialLength;
    if (deleted) {
        console.log(`Permanently deleted strategy ${strategyId}`);
    } else {
         console.warn(`Strategy ${strategyId} not found for permanent deletion.`);
    }
    return deleted;
}


/**
 * Archives a strategy by changing its status to 'Archived'.
 * @param strategyId The ID of the strategy to archive.
 * @returns A promise that resolves to the updated (archived) Strategy object or null if not found.
 */
export async function archiveStrategy(strategyId: string): Promise<Strategy | null> {
    console.log(`Archiving strategy ${strategyId}`);
    // Use the existing updateStrategy function with the new status
    return updateStrategy(strategyId, { status: 'Archived' });
}


// --- AI-related functions ---

/**
 * Calls the Genkit flow to suggest a strategy configuration.
 * This function directly calls the imported AI flow function.
 */
export async function suggestStrategyConfig(input: SuggestStrategyConfigInput): Promise<SuggestStrategyConfigOutput> {
    console.log("Calling Genkit flow 'suggestStrategyConfig'...");
    try {
        // Input validation could be added here before calling the flow
        const result = await suggestStrategyConfigFlow(input);
        console.log("Genkit flow 'suggestStrategyConfig' successful.");
        return result;
    } catch (error) {
         console.error("Error calling Genkit flow 'suggestStrategyConfig':", error);
         // Re-throw or handle error appropriately
         throw new Error(`AI suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Simulates the process of generating, coding, backtesting a strategy based on AI suggestion.
 * In a real app, this would involve more complex steps:
 * 1. Call the LLM to generate code based on the suggested config (potentially another Genkit flow).
 * 2. Save the code (potentially using the backend file storage mechanism).
 * 3. Trigger a backtesting process (potentially another agent or service, referencing the saved code).
 * 4. Parse backtest results.
 * 5. If successful, add the strategy using addStrategy.
 * @param suggestion The configuration suggested by the AI.
 * @returns A promise resolving to the new Strategy if successful, null otherwise.
 */
export async function generateAndTestStrategyFromSuggestion(suggestion: SuggestStrategyConfigOutput): Promise<Strategy | null> {
    console.log(`Simulating generation & backtesting for: ${suggestion.strategyName}`);
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); // Simulate coding & backtesting (longer delay)

    // Simulate success/failure based on suggestion (e.g., higher risk might fail more often)
    let successRate = 0.7; // Base success rate
    if (suggestion.riskLevel === 'high') successRate = 0.5;
    if (suggestion.riskLevel === 'low') successRate = 0.8;
    const isSuccessful = Math.random() < successRate;

    // Simulate potential random errors during the process
    try {
         simulateError(); 
    } catch(error) {
        console.error(`Simulated error during generation/backtest for ${suggestion.strategyName}:`, error);
        throw new Error(`Generation/Backtesting process failed unexpectedly for ${suggestion.strategyName}.`);
    }


    if (isSuccessful) {
        console.log(`Backtesting successful for ${suggestion.strategyName}. Adding to strategies.`);
        try {
            const newStrategyData: Omit<Strategy, 'id' | 'pnl' | 'winRate'> = {
                name: suggestion.strategyName,
                description: `AI-generated (${suggestion.riskLevel} risk, exp. ${suggestion.expectedReturn}% return). Config: ${JSON.stringify(suggestion.configurationOptions)}`,
                status: 'Inactive', // Default to Inactive unless auto-deploy is on
                source: 'AI-Generated',
                // parameters: suggestion.configurationOptions, // Store parameters if needed
            };
            // Use the actual addStrategy function which includes its own delay and error simulation
            const createdStrategy = await addStrategy(newStrategyData);
            // Simulate assigning some realistic (maybe slightly random) initial PnL/WinRate after "backtest"
             if (createdStrategy) {
                 createdStrategy.pnl = parseFloat(((Math.random() - 0.4) * 500).toFixed(2)); // Example: Random PnL around 0
                 createdStrategy.winRate = parseFloat((40 + Math.random() * 30).toFixed(1)); // Example: Win rate between 40-70%
                 await updateStrategy(createdStrategy.id, { pnl: createdStrategy.pnl, winRate: createdStrategy.winRate });
                // Add mock code for AI generated strategy
                mockStrategyCode[createdStrategy.id] = `# AI Generated Strategy: ${createdStrategy.name}\n# Risk Level: ${suggestion.riskLevel}\n# Expected Return: ${suggestion.expectedReturn}%\n\nclass ${createdStrategy.name.replace(/\s+/g, '')}(Strategy):\n    def initialize(self):\n        self.log_message("${createdStrategy.name} Initialized (AI Generated).")\n        self.parameters = ${JSON.stringify(suggestion.configurationOptions, null, 4)}\n\n    def on_trading_iteration(self):\n        self.log_message("AI strategy ${createdStrategy.name} trading iteration...")\n        # AI generated logic would be here\n`;
             }
            return createdStrategy;
        } catch (addError) {
             console.error(`Failed to add successfully backtested strategy ${suggestion.strategyName}:`, addError);
             // Even if backtest was "successful", adding might fail
             throw new Error(`Failed to save the generated strategy ${suggestion.strategyName} after successful backtest.`);
        }
    } else {
        console.log(`Backtesting failed for ${suggestion.strategyName}. Strategy not added.`);
        return null; // Indicate failure clearly
    }
}

/**
 * Saves the code for a given strategy (mock implementation).
 * In a real system, this would involve updating the strategy's file in storage
 * or its code content in a database.
 * @param strategyId The ID of the strategy.
 * @param code The new code string.
 * @returns A promise resolving to true if successful, false otherwise.
 */
export async function saveStrategyCode(strategyId: string, code: string): Promise<boolean> {
    console.log(`Saving code for strategy ID: ${strategyId}`);
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 200));
    simulateError(0.05);

    // Find the strategy to ensure it exists
    const strategy = mockStrategies.find(s => s.id === strategyId);
    if (!strategy) {
        console.warn(`Strategy ${strategyId} not found. Cannot save code.`);
        return false;
    }
     if (strategy.source !== 'Uploaded' && strategy.source !== 'AI-Generated') { // Assuming AI-gen code can also be edited/saved
         console.warn(`Strategy ${strategyId} is not of a type that supports direct code saving in this mock (e.g., ${strategy.source}).`);
         // In a real system, you might allow saving code for AI-generated strategies too.
         // For now, let's allow it for mock purposes.
         // return false;
     }

    // In a real backend:
    // 1. If strategy.fileName exists, overwrite the file content.
    // 2. If code is stored in DB, update the DB record.
    // 3. Potentially re-validate the code or mark for re-backtesting.

    mockStrategyCode[strategyId] = code;
    // If strategy was 'AI-Generated' but now has user-saved code, maybe update its source?
    // Or assume 'AI-Generated' means the origin, and it can still be edited.
    console.log(`Code for strategy ${strategyId} saved successfully (mock).`);
    return true;
}
