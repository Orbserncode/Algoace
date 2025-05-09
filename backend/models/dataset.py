from typing import Optional, List, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, String
from datetime import datetime
from enum import Enum

class DatasetCategoryEnum(str, Enum):
    FOREX = 'forex'
    CRYPTO = 'crypto'
    STOCKS = 'stocks'
    FUTURES = 'futures'
    COMMODITIES = 'commodities'
    INDICES = 'indices'
    OTHER = 'other'

class DatasetFormatEnum(str, Enum):
    CSV = 'csv'
    JSON = 'json'
    PARQUET = 'parquet'
    OTHER = 'other'

class Dataset(SQLModel, table=True):
    """Model for storing dataset information"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: str
    category: DatasetCategoryEnum
    subcategory: str
    source: str
    format: DatasetFormatEnum
    size: int  # in KB
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    path: str
    dataset_metadata: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))

class DatasetSubcategory(SQLModel, table=True):
    """Model for storing dataset subcategories"""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: DatasetCategoryEnum
    description: str

class AgentRecommendationType(str, Enum):
    SENTIMENT = 'sentiment'
    PRICE_PREDICTION = 'price_prediction'
    STRATEGY_SUGGESTION = 'strategy_suggestion'
    RISK_ASSESSMENT = 'risk_assessment'
    OTHER = 'other'

class AgentRecommendation(SQLModel, table=True):
    """Model for storing agent recommendations for datasets"""
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    agent_name: str  # Store agent name instead of ID to avoid foreign key issues
    dataset_id: int = Field(foreign_key="dataset.id", index=True)
    type: AgentRecommendationType
    content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    confidence: float
    tags: List[str] = Field(default_factory=list, sa_column=Column(JSON))