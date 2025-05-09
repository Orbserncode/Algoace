from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

class EmaCrossStrategy(Strategy):
    """
    Simple EMA crossover strategy.
    
    This strategy buys when the short EMA crosses above the long EMA
    and sells when the short EMA crosses below the long EMA.
    """
    
    def initialize(self):
        self.sleeptime = "1D"
        self.set_market("us_equities")
        
        # Strategy parameters
        self.short_window = 10
        self.long_window = 30
        self.symbol = self.parameters.get("symbol", "SPY")
    
    def on_trading_iteration(self):
        # Get historical data
        bars = self.get_historical_prices(
            self.symbol, 
            self.long_window + 10, 
            frequency=self.sleeptime
        )
        
        if bars is None:
            self.log_message("No data available for symbol: {}".format(self.symbol))
            return
        
        # Calculate EMAs
        prices = bars.close.values
        short_ema = self.calculate_ema(prices, self.short_window)
        long_ema = self.calculate_ema(prices, self.long_window)
        
        # Get current position
        position = self.get_position(self.symbol)
        
        # Trading logic
        if short_ema[-1] > long_ema[-1] and short_ema[-2] <= long_ema[-2]:
            # Bullish crossover - buy signal
            if position is None:
                # No position, buy
                self.log_message(f"BUY signal for {self.symbol}")
                qty = self.calculate_buy_quantity(self.symbol)
                if qty > 0:
                    self.submit_order(self.symbol, qty)
        
        elif short_ema[-1] < long_ema[-1] and short_ema[-2] >= long_ema[-2]:
            # Bearish crossover - sell signal
            if position is not None and position.quantity > 0:
                # Have position, sell
                self.log_message(f"SELL signal for {self.symbol}")
                self.submit_order(self.symbol, -position.quantity)
    
    def calculate_ema(self, prices, window):
        """Calculate Exponential Moving Average"""
        return pd.Series(prices).ewm(span=window, adjust=False).mean().values
    
    def calculate_buy_quantity(self, symbol):
        """Calculate the quantity to buy based on available cash"""
        price = self.get_last_price(symbol)
        if price is None:
            return 0
        
        cash = self.get_cash()
        # Use 95% of available cash
        target_value = cash * 0.95
        qty = int(target_value / price)
        return qty

# For backtesting
if __name__ == "__main__":
    # Backtest parameters
    start_date = datetime(2020, 1, 1)
    end_date = datetime(2023, 1, 1)
    
    # Initialize strategy with parameters
    strategy_params = {"symbol": "AAPL"}
    
    # Create backtest
    backtest = YahooDataBacktesting(
        EmaCrossStrategy,
        start_date,
        end_date,
        parameters=strategy_params
    )
    
    # Run backtest
    results = backtest.run()
    backtest.plot_results()