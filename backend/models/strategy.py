from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON
from datetime import datetime

class StrategyBase(SQLModel):
    name: str = Field(index=True)
    description: str
    status: str = Field(default='Inactive')  # Active, Inactive, Debugging, Backtesting, Archived
    source: Optional[str] = Field(default=None)  # AI-Generated, Uploaded
    file_name: Optional[str] = Field(default=None)  # Store original filename if uploaded
    pnl: Optional[float] = Field(default=0.0)
    win_rate: Optional[float] = Field(default=0.0)  # Store as decimal (e.g., 65.2 for 65.2%)
    # Generation scheduling fields
    generation_schedule: Optional[str] = Field(default=None)  # manual, startup, daily, weekly
    last_generation_time: Optional[str] = Field(default=None)  # ISO format datetime string
    generation_config: Optional[Dict[str, Any]] = Field(default_factory=dict, sa_column=Column(JSON))  # Store generation parameters

# Database model (table=True indicates this is a table model)
class Strategy(StrategyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

# Properties to receive via API on creation
class StrategyCreate(StrategyBase):
    pass

# Properties to receive via API on update, all optional
class StrategyUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    file_name: Optional[str] = None
    pnl: Optional[float] = None
    win_rate: Optional[float] = None
    generation_schedule: Optional[str] = None
    last_generation_time: Optional[str] = None
    generation_config: Optional[Dict[str, Any]] = None

# Properties to return via API
class StrategyRead(StrategyBase):
    id: int