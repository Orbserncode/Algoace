from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TradeType(str, Enum):
    BUY = "BUY"
    SELL = "SELL"

class TradingMethod(str, Enum):
    SPOT = "Spot"
    FUTURES = "Futures"
    OPTIONS = "Options"

class AssetType(str, Enum):
    STOCK = "Stock"
    CRYPTO = "Crypto"
    FOREX = "Forex"
    ETF = "ETF"

class LogType(str, Enum):
    TRADE = "Trade"
    SIGNAL = "Signal"
    SYSTEM = "System"
    ERROR = "Error"

# Base models for creation
class PerformanceDataPointCreate(SQLModel):
    date: datetime
    portfolio_value: float
    profit: float
    strategy_id: Optional[str] = None

class LogEntryCreate(SQLModel):
    timestamp: datetime
    type: LogType
    message: str
    strategy: Optional[str] = None

class TradeCreate(SQLModel):
    timestamp: datetime
    strategy_id: str
    strategy_name: Optional[str] = None
    symbol: str
    trade_type: TradeType
    trading_method: TradingMethod
    asset_type: AssetType
    category: Optional[str] = None
    lot_size: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    broker_name: Optional[str] = None
    pips_pnl: Optional[float] = None
    leverage: Optional[float] = None
    is_winning: Optional[bool] = None

class KeyMetricsCreate(SQLModel):
    total_pnl: float
    today_pnl: float
    active_strategies: int
    total_trades_today: int
    win_rate_last_7d: float
    max_drawdown: float

# Database models
class PerformanceDataPoint(SQLModel, table=True):
    __tablename__ = "performance_data"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    date: datetime = Field(index=True)
    portfolio_value: float
    profit: float
    strategy_id: Optional[str] = Field(default=None, index=True)
    
    class Config:
        schema_extra = {
            "example": {
                "date": "2025-05-01T00:00:00",
                "portfolio_value": 10500.0,
                "profit": 500.0,
                "strategy_id": "strat-001"
            }
        }

class LogEntry(SQLModel, table=True):
    __tablename__ = "activity_logs"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(index=True)
    type: LogType
    message: str
    strategy: Optional[str] = Field(default=None, index=True)
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2025-05-07T12:30:45",
                "type": "Trade",
                "message": "Executed BUY AAPL @ 210.50, Size: 10",
                "strategy": "strat-001"
            }
        }

class Trade(SQLModel, table=True):
    __tablename__ = "trades"
    
    id: str = Field(primary_key=True)
    timestamp: datetime = Field(index=True)
    strategy_id: str = Field(index=True)
    strategy_name: Optional[str] = None
    symbol: str = Field(index=True)
    trade_type: TradeType
    trading_method: TradingMethod
    asset_type: AssetType
    category: Optional[str] = None
    lot_size: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    broker_name: Optional[str] = Field(default=None, index=True)
    pips_pnl: Optional[float] = None
    leverage: Optional[float] = None
    is_winning: Optional[bool] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "t101",
                "timestamp": "2025-05-07T12:30:45",
                "strategy_id": "strat-001",
                "strategy_name": "Momentum Burst",
                "symbol": "AAPL",
                "trade_type": "BUY",
                "trading_method": "Spot",
                "asset_type": "Stock",
                "category": "Tech",
                "lot_size": 10.0,
                "entry_price": 210.5,
                "exit_price": 215.75,
                "pnl": 52.5,
                "broker_name": "Interactive Brokers",
                "pips_pnl": 525,
                "leverage": 1.0,
                "is_winning": True
            }
        }

class KeyMetrics(SQLModel, table=True):
    __tablename__ = "key_metrics"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.now, index=True)
    total_pnl: float
    today_pnl: float
    active_strategies: int
    total_trades_today: int
    win_rate_last_7d: float
    max_drawdown: float
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2025-05-07T00:00:00",
                "total_pnl": 1200.0,
                "today_pnl": -75.5,
                "active_strategies": 3,
                "total_trades_today": 8,
                "win_rate_last_7d": 71.2,
                "max_drawdown": 9.5
            }
        }