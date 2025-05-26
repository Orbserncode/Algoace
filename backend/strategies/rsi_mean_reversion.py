from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting, PandasDataBacktesting
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

class RsiMeanReversionStrategy(Strategy):
    """
    RSI Mean Reversion Strategy.
    
    This strategy buys when RSI is oversold (below oversold_threshold) and sells when RSI is overbought (above overbought_threshold).
    It's a classic mean reversion strategy based on the idea that extreme RSI values tend to revert to the mean.
    """
    
    def initialize(self):
        # Get parameters from the parameters dictionary with defaults
        self.sleeptime = self.parameters.get("timeframe", "1D")
        self.market = self.parameters.get("market", "us_equities")
        self.set_market(self.market)
        
        # Strategy parameters
        self.rsi_period = self.parameters.get("rsi_period", 14)
        self.oversold_threshold = self.parameters.get("oversold_threshold", 30)
        self.overbought_threshold = self.parameters.get("overbought_threshold", 70)
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
    strategy_params = {
        "symbol": "AAPL",
        "timeframe": "1D",
        "market": "us_equities",
        "rsi_period": 14,
        "oversold_threshold": 30,
        "overbought_threshold": 70
    }
    
    # Choose data source based on environment variable or argument
    import os
    data_source = os.environ.get("DATA_SOURCE", "yahoo")
    
    if data_source.lower() == "yahoo":
        # Use Yahoo Finance data
        backtest = YahooDataBacktesting(
            RsiMeanReversionStrategy,
            start_date,
            end_date,
            parameters=strategy_params
        )
    elif data_source.lower() == "csv":
        # Use local CSV data
        import pandas as pd
        
        # Load data from CSV file
        data_path = os.environ.get("DATA_PATH", "data/stocks/aapl_daily.csv")
        data = pd.read_csv(data_path)
        
        # Ensure timestamp column is datetime
        if 'timestamp' in data.columns:
            data['timestamp'] = pd.to_datetime(data['timestamp'])
            data = data.set_index('timestamp')
        elif 'date' in data.columns:
            data['timestamp'] = pd.to_datetime(data['date'])
            data = data.set_index('timestamp')
        
        # Create custom data source
        class CustomDataSource:
            def __init__(self, data, symbol):
                self.data = data
                self.symbol = symbol
            
            def get_symbol_data(self, symbol, start_date, end_date, timeframe="1d"):
                return self.data if symbol == self.symbol else None
        
        # Create data source
        data_source = CustomDataSource(data, strategy_params["symbol"])
        
        # Create backtest with PandasDataBacktesting
        backtest = PandasDataBacktesting(
            RsiMeanReversionStrategy,
            start_date,
            end_date,
            parameters=strategy_params,
            data_source=data_source,
            config={"BYPASS_MARKET_SCHEDULE": True}
        )
    else:
        raise ValueError(f"Unknown data source: {data_source}")
    
    # Run backtest
    results = backtest.run()
    backtest.plot_results()