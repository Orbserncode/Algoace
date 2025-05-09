from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

class RsiMeanReversionStrategy(Strategy):
    """
    RSI Mean Reversion Strategy.
    
    This strategy buys when RSI is oversold (below 30) and sells when RSI is overbought (above 70).
    It's a classic mean reversion strategy based on the idea that extreme RSI values tend to revert to the mean.
    """
    
    def initialize(self):
        self.sleeptime = "1D"
        self.set_market("us_equities")
        
        # Strategy parameters
        self.rsi_period = 14
        self.oversold_threshold = 30
        self.overbought_threshold = 70
        self.symbol = self.parameters.get("symbol", "SPY")
    
    def on_trading_iteration(self):
        # Get historical data
        bars = self.get_historical_prices(
            self.symbol, 
            self.rsi_period + 10, 
            frequency=self.sleeptime
        )
        
        if bars is None:
            self.log_message("No data available for symbol: {}".format(self.symbol))
            return
        
        # Calculate RSI
        prices = bars.close.values
        rsi = self.calculate_rsi(prices, self.rsi_period)
        
        # Get current position
        position = self.get_position(self.symbol)
        current_rsi = rsi[-1]
        
        self.log_message(f"Current RSI for {self.symbol}: {current_rsi:.2f}")
        
        # Trading logic
        if current_rsi < self.oversold_threshold:
            # RSI is oversold - buy signal
            if position is None:
                # No position, buy
                self.log_message(f"BUY signal for {self.symbol} (RSI: {current_rsi:.2f})")
                qty = self.calculate_buy_quantity(self.symbol)
                if qty > 0:
                    self.submit_order(self.symbol, qty)
        
        elif current_rsi > self.overbought_threshold:
            # RSI is overbought - sell signal
            if position is not None and position.quantity > 0:
                # Have position, sell
                self.log_message(f"SELL signal for {self.symbol} (RSI: {current_rsi:.2f})")
                self.submit_order(self.symbol, -position.quantity)
    
    def calculate_rsi(self, prices, period):
        """Calculate Relative Strength Index"""
        # Calculate price changes
        deltas = np.diff(prices)
        seed = deltas[:period+1]
        
        # Calculate gains and losses
        up = seed[seed >= 0].sum() / period
        down = -seed[seed < 0].sum() / period
        
        if down == 0:
            rs = float('inf')
        else:
            rs = up / down
        
        rsi = np.zeros_like(prices)
        rsi[:period] = 100. - 100. / (1. + rs)
        
        # Calculate RSI for the rest of the data
        for i in range(period, len(prices)):
            delta = deltas[i-1]
            
            if delta > 0:
                upval = delta
                downval = 0.
            else:
                upval = 0.
                downval = -delta
            
            up = (up * (period - 1) + upval) / period
            down = (down * (period - 1) + downval) / period
            
            if down == 0:
                rs = float('inf')
            else:
                rs = up / down
            
            rsi[i] = 100. - 100. / (1. + rs)
        
        return rsi
    
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
        RsiMeanReversionStrategy,
        start_date,
        end_date,
        parameters=strategy_params
    )
    
    # Run backtest
    results = backtest.run()
    backtest.plot_results()