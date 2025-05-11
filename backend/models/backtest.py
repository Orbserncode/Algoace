from typing import Optional, List, Dict, Any
from sqlmodel import Field, SQLModel, Column, Relationship
from sqlalchemy import JSON, String, Text
from datetime import datetime

class BacktestResult(SQLModel, table=True):
    """Model for storing backtest results"""
    id: Optional[int] = Field(default=None, primary_key=True)
    strategy_id: str = Field(index=True)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    parameters: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    summary_metrics: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    equity_curve: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    trades: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    log_output: str = Field(default="", sa_column=Column(Text))
    
    # Add a field to store AI-generated analysis
    ai_analysis: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    # Add a field to track if the backtest result is locked (protected from deletion)
    locked: bool = Field(default=False)