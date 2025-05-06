from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import String # Use SQLAlchemy's String for potential length constraints

# Shared properties between Create/Update schemas and the DB model
class StrategyBase(SQLModel):
    name: str = Field(index=True)
    description: str
    status: str = Field(default='Inactive') # Active, Inactive, Debugging, Backtesting
    source: Optional[str] = Field(default=None) # AI-Generated, Uploaded
    file_name: Optional[str] = Field(default=None) # Store original filename if uploaded
    # Use specific types for PnL and winRate, allowing NULL initially
    pnl: Optional[float] = Field(default=0.0)
    win_rate: Optional[float] = Field(default=0.0) # Store as decimal (e.g., 65.2 for 65.2%)

# Database model (table=True indicates this is a table model)
class Strategy(StrategyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

# Properties to receive via API on creation
class StrategyCreate(StrategyBase):
    pass # Inherits all fields from StrategyBase

# Properties to receive via API on update, all optional
class StrategyUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    file_name: Optional[str] = None
    pnl: Optional[float] = None
    win_rate: Optional[float] = None

# Properties to return via API (includes ID)
class StrategyRead(StrategyBase):
    id: int

# TODO: Add models for Agent, LogEntry, PerformanceDataPoint, BacktestResult, etc. later
