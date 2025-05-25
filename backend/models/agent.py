from typing import Optional, List, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON
from enum import Enum

class AgentStatusEnum(str, Enum):
    RUNNING = 'Running'
    IDLE = 'Idle'
    ERROR = 'Error'
    STOPPED = 'Stopped'

class AgentTypeEnum(str, Enum):
    STRATEGY_CODING = 'Strategy Coding Agent'
    RESEARCH = 'Research & News Agent'
    PORTFOLIO = 'Portfolio Analyst Agent'
    RISK = 'Risk Manager Agent'
    EXECUTION = 'Execution Agent'
    BACKTEST_ANALYZER = 'Backtest Analyzer Agent' # Add this line

# Base Pydantic model for default agent configuration
class BaseAgentConfigModel(SQLModel):
    logLevel: str = Field(default='info')
    enabledTools: List[str] = Field(default_factory=list)
    llmModelProviderId: str = Field(default='groq')
    llmModelName: Optional[str] = None

class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)  # Agent names should be unique
    type: AgentTypeEnum  # Using the Enum for type
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

class AgentCreate(SQLModel):
    name: str
    type: AgentTypeEnum
    description: str
    isDefault: bool = False
    config: Dict[str, Any] = Field(default_factory=dict)
    associatedStrategyIds: Optional[List[str]] = Field(default_factory=list)

class AgentUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[AgentStatusEnum] = None
    isDefault: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    associatedStrategyIds: Optional[List[str]] = None
    tasksCompleted: Optional[int] = None
    errors: Optional[int] = None