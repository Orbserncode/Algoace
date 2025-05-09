from typing import Optional, List, Any, Dict
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON
from datetime import datetime
from enum import Enum

# --- Strategy Config Models ---
class ConfigStatusEnum(str, Enum):
    ACTIVE = 'Active'
    ARCHIVED = 'Archived'

class ConfigSourceEnum(str, Enum):
    AI_GENERATED = 'AI-Generated'
    USER_SAVED = 'User-Saved'

class StrategyConfig(SQLModel, table=True):
    """Model for storing strategy configuration files"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
    config_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    source: ConfigSourceEnum = Field(default=ConfigSourceEnum.USER_SAVED)
    status: ConfigStatusEnum = Field(default=ConfigStatusEnum.ACTIVE)
    strategy_id: Optional[str] = Field(default=None, index=True)  # ID of associated strategy
    performance_summary: Optional[str] = Field(default=None)  # Brief summary of performance