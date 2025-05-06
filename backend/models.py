from typing import Optional, List, Any, Dict # Added List, Any, Dict
from sqlmodel import Field, SQLModel, Column # Keep SQLModel import
from sqlalchemy import String, JSON # Use SQLAlchemy's String and JSON type
from enum import Enum

# Shared properties between Create/Update schemas and the DB model
class StrategyBase(SQLModel):
    name: str = Field(index=True)
    description: str
    status: str = Field(default='Inactive') # Active, Inactive, Debugging, Backtesting, Archived
    source: Optional[str] = Field(default=None) # AI-Generated, Uploaded
    file_name: Optional[str] = Field(default=None) # Store original filename if uploaded
    pnl: Optional[float] = Field(default=0.0)
    win_rate: Optional[float] = Field(default=0.0) # Store as decimal (e.g., 65.2 for 65.2%)

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

# Properties to return via API (includes ID)
class StrategyRead(StrategyBase):
    id: int


# === Agent Models ===
class AgentStatusEnum(str, Enum):
    RUNNING = 'Running'
    IDLE = 'Idle'
    ERROR = 'Error'
    STOPPED = 'Stopped'

class AgentTypeEnum(str, Enum):
    STRATEGY_CODING = 'Strategy Coding Agent'
    EXECUTION = 'Execution Agent'
    DATA = 'Data Agent'
    ANALYSIS = 'Analysis Agent'


# Base Pydantic model for default agent configuration
# This mirrors the BaseAgentConfig in schemas.py for default values
class BaseAgentConfigModel(SQLModel): # Using SQLModel here for consistency if it were a table, but it's for default_factory
    logLevel: str = Field(default='info')
    enabledTools: List[str] = Field(default_factory=list)


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True) # Agent names should be unique
    type: AgentTypeEnum # Using the Enum for type
    status: AgentStatusEnum = Field(default=AgentStatusEnum.IDLE)
    description: str
    tasksCompleted: int = Field(default=0)
    errors: int = Field(default=0)
    isDefault: bool = Field(default=False)
    
    # Store specific agent configuration as JSON.
    # The structure of this JSON will vary based on agent type.
    # Pydantic models in schemas.py will be used to validate this on create/update.
    config: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    
    # For agents linked to specific strategies (e.g., Execution Agent)
    # This can be a JSON list of strategy IDs or a relationship table if preferred
    associatedStrategyIds: Optional[List[str]] = Field(default_factory=list, sa_column=Column(JSON))


# TODO: Add models for LogEntry, PerformanceDataPoint, BacktestResult, etc. later
# For example, LogEntry could be:
# class LogEntry(SQLModel, table=True):
#     id: Optional[int] = Field(default=None, primary_key=True)
#     timestamp: datetime = Field(default_factory=datetime.utcnow)
#     agent_id: Optional[str] = Field(default=None, foreign_key="agent.id", index=True) # Link to agent if applicable
#     strategy_id: Optional[str] = Field(default=None, foreign_key="strategy.id", index=True) # Link to strategy
#     type: str # e.g., INFO, ERROR, TRADE, SIGNAL
#     message: str
