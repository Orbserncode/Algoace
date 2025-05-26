from lumibot.strategies.strategy import Strategy
from lumibot.backtesting import YahooDataBacktesting, PandasDataBacktesting
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

class BollingerBreakoutStrategy(Strategy):
    """
    Bollinger Bands Breakout Strategy.
    
    This strategy buys when price breaks above the upper Bollinger Band
    and sells when price breaks below the lower Bollinger Band.
    It's a momentum strategy based on the idea that a breakout from the bands
    indicates a strong trend that will continue.
    """
    
    def initialize(self):
        # Get parameters from the parameters dictionary with defaults
        self.sleeptime = self.parameters.get("timeframe", "1D")
        self.market = self.parameters.get("market", "us_equities")
        self.set_market(self.market)
        
        # Strategy parameters
        self.bb_period = self.parameters.get("bb_period", 20)
        self.bb_std = self.parameters.get("bb_std", 2.0)
        self.symbol = self.parameters.get("symbol", "SPY")
    
    def on_trading_iteration(self):
        # Get historical data
        bars = self.get_historical_prices(
            self.symbol, 
            self.bb_period + 10, 
            frequency=self.sleeptime
        )
        
        if bars is None:
            self.log_message("No data available for symbol: {}".format(self.symbol))
            return
        
        # Calculate Bollinger Bands
        prices = bars.close.values
        upper_band, middle_band, lower_band = self.calculate_bollinger_bands(
            prices, self.bb_period, self.bb_std
        )
        
        # Get current position
        position = self.get_position(self.symbol)
        
        # Current price and bands
        current_price = prices[-1]
        current_upper = upper_band[-1]
        current_lower = lower_band[-1]
        
        self.log_message(f"Current price: {current_price:.2f}, Upper BB: {current_upper:.2f}, Lower BB: {current_lower:.2f}")
        
        # Previous price and bands
        prev_price = prices[-2]
        prev_upper = upper_band[-2]
        prev_lower = lower_band[-2]
        
        # Trading logic
        if current_price > current_upper and prev_price <= prev_upper:
            # Price breaks above upper band - buy signal (momentum)
            if position is None:
                # No position, buy
                self.log_message(f"BUY signal for {self.symbol} (Upper BB breakout)")
                qty = self.calculate_buy_quantity(self.symbol)
                if qty > 0:
                    self.submit_order(self.symbol, qty)
        
        elif current_price < current_lower and prev_price >= prev_lower:
            # Price breaks below lower band - sell signal
            if position is not None and position.quantity > 0:
                # Have position, sell
                self.log_message(f"SELL signal for {self.symbol} (Lower BB breakout)")
                self.submit_order(self.symbol, -position.quantity)
    
    def calculate_bollinger_bands(self, prices, period, num_std):
        """Calculate Bollinger Bands"""
        # Calculate rolling mean and standard deviation
        rolling_mean = pd.Series(prices).rolling(window=period).mean()
        rolling_std = pd.Series(prices).rolling(window=period).std()
        
        # Calculate upper and lower bands
        upper_band = rolling_mean + (rolling_std * num_std)
        lower_band = rolling_mean - (rolling_std * num_std)
        
        return upper_band.values, rolling_mean.values, lower_band.values
    
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
        "bb_period": 20,
        "bb_std": 2.0
    }
    
    # Choose data source based on environment variable or argument
    import os
    data_source = os.environ.get("DATA_SOURCE", "yahoo")
    
    if data_source.lower() == "yahoo":
        # Use Yahoo Finance data
        backtest = YahooDataBacktesting(
            BollingerBreakoutStrategy,
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
            BollingerBreakoutStrategy,
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