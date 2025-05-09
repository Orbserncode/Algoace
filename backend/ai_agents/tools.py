# backend/ai_agents/tools.py
from pydantic import BaseModel, Field
from typing import Type, List, Callable, Dict, Any, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend import schemas

# --- Tool Definitions ---
# These tools should correspond to the `ToolNameEnum` in `schemas.py`
# Each tool needs a Pydantic model for its input and a `run` method.

class MarketDataFetcherInput(BaseModel):
    asset_symbol: str = Field(description="The symbol of the asset to fetch data for (e.g., AAPL, BTC/USD).")
    timeframe: str = Field(default="1d", description="The timeframe for the data (e.g., 1m, 5m, 1h, 1d).")
    start_date: Optional[str] = Field(default=None, description="Start date for historical data (YYYY-MM-DD).")
    end_date: Optional[str] = Field(default=None, description="End date for historical data (YYYY-MM-DD).")

class MarketDataFetcherTool(BaseModel):
    """Fetches historical and real-time market data for specified assets."""
    # This tool would interact with a data provider service (e.g., yfinance, broker API)
    
    def run(self, inputs: MarketDataFetcherInput) -> Dict[str, Any]:
        # Mock implementation
        print(f"TOOL: MarketDataFetcherTool called with inputs: {inputs}")
        if inputs.asset_symbol == "AAPL":
            return {
                "symbol": "AAPL",
                "data": [
                    {"date": "2024-01-01", "open": 170, "high": 172, "low": 169, "close": 171, "volume": 1000000},
                    {"date": "2024-01-02", "open": 171, "high": 173, "low": 170, "close": 172, "volume": 1200000},
                ],
                "message": f"Fetched mock data for {inputs.asset_symbol}."
            }
        return {"error": f"Data not available for {inputs.asset_symbol}"}


class TechnicalIndicatorCalculatorInput(BaseModel):
    asset_symbol: str = Field(description="The symbol of the asset.")
    indicator_name: str = Field(description="Name of the technical indicator (e.g., RSI, MACD, SMA).")
    parameters: Dict[str, Any] = Field(description="Parameters for the indicator (e.g., period, window sizes).")

class TechnicalIndicatorCalculatorTool(BaseModel):
    """Calculates various technical indicators (e.g., RSI, MACD, SMA)."""
    
    def run(self, inputs: TechnicalIndicatorCalculatorInput) -> Dict[str, Any]:
        # Mock implementation
        print(f"TOOL: TechnicalIndicatorCalculatorTool called with inputs: {inputs}")
        if inputs.indicator_name.upper() == "RSI" and inputs.asset_symbol == "AAPL":
            return {"indicator_value": 65.7, "message": f"Calculated mock RSI for {inputs.asset_symbol}."}
        return {"error": f"Could not calculate {inputs.indicator_name} for {inputs.asset_symbol}."}

# TODO: Implement other tools from schemas.ToolNameEnum
# - WebSearcherTool (might use SerpAPI key from agent/global config)
# - PortfolioManagerTool
# - OrderExecutorTool
# - BacktesterTool

# --- Tool Registry ---
# A simple way to map tool names from config to their implementation classes
# The key should match schemas.ToolNameEnum values
AVAILABLE_TOOLS_MAP: Dict[schemas.ToolNameEnum, Type[BaseModel]] = {
    schemas.ToolNameEnum.MarketDataFetcher: MarketDataFetcherTool,
    schemas.ToolNameEnum.TechnicalIndicatorCalculator: TechnicalIndicatorCalculatorTool,
    # Add other tools here as they are implemented
    # schemas.ToolNameEnum.WebSearcher: WebSearcherTool,
    # schemas.ToolNameEnum.PortfolioManager: PortfolioManagerTool,
    # schemas.ToolNameEnum.OrderExecutor: OrderExecutorTool,
    # schemas.ToolNameEnum.Backtester: BacktesterTool,
}

def get_enabled_tools_for_instructor(enabled_tool_names: List[schemas.ToolNameEnum]) -> List[Callable]:
    """
    Returns a list of callable tool instances for pydantic-ai's Instructor,
    based on the names of enabled tools.
    """
    tool_instances = []
    for tool_name in enabled_tool_names:
        tool_class = AVAILABLE_TOOLS_MAP.get(tool_name)
        if tool_class:
            # pydantic-ai's Instructor expects either a function or a Pydantic model class (not an instance)
            # If the tool is a class that has a `run` method, pydantic-ai can usually handle it.
            # Let's pass the class itself.
            tool_instances.append(tool_class) 
        else:
            print(f"Warning: Tool '{tool_name.value}' is enabled in config but no implementation found.")
    return tool_instances

from typing import Optional
