"""
Script to migrate all mock data from the frontend to the database.
This script will create the necessary tables and populate them with mock data.
"""
import os
import sys
import json
import random
from datetime import datetime, timedelta
from sqlmodel import Session, SQLModel, create_engine, Field, Column, JSON
from typing import List, Optional, Dict, Any
import enum

# Add the parent directory to the path so we can import from the backend package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the database and models
from backend.database import engine, create_db_and_tables
from backend.models.dataset import (
    Dataset,
    DatasetSubcategory,
    AgentRecommendation,
    DatasetCategoryEnum,
    DatasetFormatEnum,
    AgentRecommendationType
)

# Run the existing dataset migration script
from backend.migrate_mock_data import migrate_data as migrate_datasets

# Import the Strategy model from the models package
from backend.models.strategy import Strategy

# Define models for other entities
class StrategyStatusEnum(str, enum.Enum):
    ACTIVE = 'Active'
    INACTIVE = 'Inactive'
    ARCHIVED = 'Archived'

class StrategySourceEnum(str, enum.Enum):
    UPLOADED = 'Uploaded'
    AI_GENERATED = 'AI-Generated'
    SYSTEM = 'System'

class AgentTypeEnum(str, enum.Enum):
    RESEARCH = 'Research & News Agent'
    PORTFOLIO = 'Portfolio Analyst Agent'
    RISK = 'Risk Manager Agent'
    EXECUTION = 'Execution Agent'
    STRATEGY_CODING = 'Strategy Coding Agent'

class AgentStatusEnum(str, enum.Enum):
    IDLE = 'Idle'
    RUNNING = 'Running'
    STOPPED = 'Stopped'

class Agent(SQLModel, table=True):
    """Model for storing agent information"""
    id: Optional[str] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    type: AgentTypeEnum
    description: str
    status: AgentStatusEnum = AgentStatusEnum.IDLE
    tasks_completed: int = 0
    errors: int = 0
    is_default: bool = False
    associated_strategy_ids: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    config: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

# Mock data for strategies
mock_strategies = [
    {
        "id": "strat-001",
        "name": "EMA Cross",
        "description": "Simple EMA crossover strategy.",
        "status": StrategyStatusEnum.ACTIVE,
        "pnl": 1250.75,
        "win_rate": 65.2,
        "source": StrategySourceEnum.UPLOADED,
        "file_name": "ema_cross_strategy.py",
        "code": """
# EMA Cross Strategy Code
from lumibot.strategies.strategy import Strategy

class EmaCrossStrategy(Strategy):
    def initialize(self):
        self.sleeptime = '1D'
        # Strategy initialization code...
        """
    },
    {
        "id": "strat-002",
        "name": "RSI Oscillator",
        "description": "RSI-based mean reversion strategy.",
        "status": StrategyStatusEnum.INACTIVE,
        "pnl": -340.10,
        "win_rate": 48.9,
        "source": StrategySourceEnum.UPLOADED,
        "file_name": "rsi_mean_reversion.py",
        "code": """
# RSI Mean Reversion Strategy Code
from lumibot.strategies.strategy import Strategy

class RsiMeanReversion(Strategy):
    def initialize(self):
        self.sleeptime = '1H'
        # Strategy initialization code...
        """
    },
    {
        "id": "strat-003",
        "name": "AI Trend Follower V2",
        "description": "Uses ML to identify and follow trends (updated).",
        "status": StrategyStatusEnum.ACTIVE,
        "pnl": 3105.00,
        "win_rate": 72.1,
        "source": StrategySourceEnum.AI_GENERATED,
        "file_name": "ai_trend_follower_v2.py",
        "code": """
# AI Trend Follower V2 Code
from lumibot.strategies.strategy import Strategy

class AITrendFollowerV2(Strategy):
    def initialize(self):
        self.sleeptime = '15M'
        # Strategy initialization code...
        """
    }
]

# Mock data for agents
mock_agents = [
    {
        "id": "agent-research-1",
        "name": "Research Agent",
        "type": AgentTypeEnum.RESEARCH,
        "status": AgentStatusEnum.IDLE,
        "description": "Analyzes market news and data",
        "tasks_completed": 0,
        "errors": 0,
        "is_default": True,
        "associated_strategy_ids": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["MarketDataFetcher", "WebSearcher"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "dataProviderConfigId": "broker-alpaca-paper",
            "fetchFrequencyMinutes": 15,
            "watchedAssets": [{"brokerId": "broker-alpaca-paper", "symbol": "AAPL"}],
            "useSerpApiForNews": True,
            "researchPrompt": "Analyze the latest market news, trends, and data for the specified assets."
        }
    },
    {
        "id": "agent-portfolio-1",
        "name": "Portfolio Agent",
        "type": AgentTypeEnum.PORTFOLIO,
        "status": AgentStatusEnum.IDLE,
        "description": "Manages portfolio allocation",
        "tasks_completed": 0,
        "errors": 0,
        "is_default": True,
        "associated_strategy_ids": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "MarketDataFetcher"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "analysisPrompt": "Analyze the portfolio's current performance, asset allocation, and recent trades.",
            "analysisFrequencyHours": 4,
            "targetAllocation": {"SPY": 0.6, "QQQ": 0.3, "BONDS": 0.1},
            "rebalanceThresholdPercent": 5.0
        }
    },
    {
        "id": "agent-risk-1",
        "name": "Risk Agent",
        "type": AgentTypeEnum.RISK,
        "status": AgentStatusEnum.IDLE,
        "description": "Monitors risk metrics",
        "tasks_completed": 0,
        "errors": 0,
        "is_default": True,
        "associated_strategy_ids": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "RiskCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "riskAnalysisPrompt": "Analyze the portfolio's current risk exposure, compliance status, and market conditions.",
            "riskLimits": {"maxDrawdown": 0.15, "var95": 0.03},
            "complianceRules": ["No single asset should exceed 20% of portfolio value"],
            "analysisFrequencyHours": 2
        }
    },
    {
        "id": "agent-execution-1",
        "name": "Execution Agent",
        "type": AgentTypeEnum.EXECUTION,
        "status": AgentStatusEnum.IDLE,
        "description": "Executes trades",
        "tasks_completed": 0,
        "errors": 0,
        "is_default": True,
        "associated_strategy_ids": [],
        "config": {
            "logLevel": "info",
            "enabledTools": ["OrderExecutor", "PortfolioManager"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "brokerConfigId": "broker-alpaca-paper",
            "maxConcurrentTrades": 5,
            "orderRetryAttempts": 3,
            "executionLogicPrompt": "You are an AI assistant for an automated trading Execution Agent.",
            "requiresAllAgentConfirmation": True
        }
    }
]

def migrate_strategies():
    """Migrate strategy data to the database."""
    print("Migrating strategies...")
    with Session(engine) as session:
        # Check if data already exists
        existing_strategies = session.query(Strategy).count()
        if existing_strategies > 0:
            print(f"Found {existing_strategies} existing strategies. Skipping migration.")
            return
        
        # Migrate strategies
        for strategy_data in mock_strategies:
            # Convert the string ID to an integer for the database
            # We'll strip the 'strat-' prefix and convert to int
            strat_id = int(strategy_data["id"].split("-")[1])
            
            # Convert the mock data to the format expected by the Strategy model
            strategy = Strategy(
                id=strat_id,
                name=strategy_data["name"],
                description=strategy_data["description"],
                status=strategy_data["status"].value,  # Convert enum to string
                source=strategy_data["source"].value,  # Convert enum to string
                file_name=strategy_data.get("file_name"),
                pnl=strategy_data["pnl"],
                win_rate=strategy_data["win_rate"],
                generation_schedule="manual",
                last_generation_time=datetime.utcnow().isoformat() if strategy_data["source"] == StrategySourceEnum.AI_GENERATED else None
            )
            
            session.add(strategy)
        
        # Commit the changes
        session.commit()
        
        print(f"Successfully migrated {len(mock_strategies)} strategies.")

def migrate_agents():
    """Migrate agent data to the database."""
    print("Migrating agents...")
    with Session(engine) as session:
        # Check if data already exists
        existing_agents = session.query(Agent).count()
        if existing_agents > 0:
            print(f"Found {existing_agents} existing agents. Skipping migration.")
            return
        
        # Migrate agents
        for agent_data in mock_agents:
            agent = Agent(**agent_data)
            session.add(agent)
        
        # Commit the changes
        session.commit()
        
        print(f"Successfully migrated {len(mock_agents)} agents.")

# Import our new migration scripts
from backend.migrate_strategies_data import migrate_strategies as migrate_strategies_new
from backend.migrate_agents_data import migrate_agents as migrate_agents_new
from backend.models.monitoring import (
    PerformanceDataPoint, LogEntry, KeyMetrics, Trade,
    PerformanceDataPointCreate, LogEntryCreate, TradeCreate, KeyMetricsCreate,
    TradeType, TradingMethod, AssetType, LogType
)

def migrate_monitoring_data():
    """Migrate monitoring data to the database."""
    print("Migrating monitoring data...")
    
    # Create sample monitoring data
    with Session(engine) as session:
        # Check if data already exists
        existing_performance = session.query(PerformanceDataPoint).count()
        if existing_performance > 0:
            print(f"Found {existing_performance} existing performance data points. Skipping migration.")
            return
        
        # Create sample performance data
        start_date = datetime(2025, 4, 7)
        portfolio_value = 10000.0
        
        for i in range(31):  # One month of data
            date = start_date + timedelta(days=i)
            
            # Generate a somewhat realistic portfolio value
            change = (random.random() - 0.45) * 200  # Random change between -90 and +110
            portfolio_value += change
            profit = portfolio_value - 10000.0
            
            # Create performance data point
            perf_data = PerformanceDataPoint(
                date=date.date(),
                portfolio_value=portfolio_value,
                profit=profit
            )
            session.add(perf_data)
            
            # Add strategy-specific performance for a few strategies
            if i % 3 == 0:  # Every 3 days
                for strat_id in range(1, 4):  # For strategies 1-3
                    strat_perf = PerformanceDataPoint(
                        date=date.date(),
                        portfolio_value=portfolio_value / 3,
                        profit=profit / 3,
                        strategy_id=f"strat-00{strat_id}"
                    )
                    session.add(strat_perf)
        
        # Create sample log entries
        log_types = [LogType.TRADE, LogType.SIGNAL, LogType.SYSTEM, LogType.ERROR]
        strategies = ["strat-001", "strat-002", "strat-003", "System"]
        
        for i in range(20):  # 20 log entries
            log_time = datetime.now() - timedelta(hours=i*2)
            log_type = random.choice(log_types)
            strategy = random.choice(strategies)
            
            if log_type == LogType.TRADE:
                message = f"Executed {'BUY' if random.random() > 0.5 else 'SELL'} {'AAPL' if random.random() > 0.5 else 'MSFT'} @ {random.randint(100, 200)}.{random.randint(10, 99)}"
            elif log_type == LogType.SIGNAL:
                message = f"Signal detected for {'AAPL' if random.random() > 0.5 else 'MSFT'}"
            elif log_type == LogType.ERROR:
                message = "Connection error with data provider"
            else:
                message = "System check completed"
            
            log_entry = LogEntry(
                timestamp=log_time,
                type=log_type,
                message=message,
                strategy=strategy
            )
            session.add(log_entry)
        
        # Create sample trades
        symbols = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL"]
        trade_types = [TradeType.BUY, TradeType.SELL]
        trading_methods = [TradingMethod.SPOT, TradingMethod.FUTURES]
        asset_types = [AssetType.STOCK, AssetType.CRYPTO]
        
        for i in range(30):  # 30 trades
            trade_time = datetime.now() - timedelta(hours=i*4)
            symbol = random.choice(symbols)
            trade_type = random.choice(trade_types)
            strategy_id = f"strat-00{random.randint(1, 3)}"
            
            # Some trades are closed, some are open
            is_closed = random.random() > 0.3
            
            entry_price = random.randint(100, 1000) + random.random()
            exit_price = None
            pnl = None
            
            if is_closed:
                exit_price = entry_price * (1 + (random.random() - 0.4) * 0.1)  # +/- 5% from entry
                pnl = (exit_price - entry_price) * random.randint(1, 10)
            
            trade = Trade(
                id=f"trade-{i+1}",
                timestamp=trade_time,
                strategy_id=strategy_id,
                strategy_name=f"Strategy {strategy_id[-1]}",
                symbol=symbol,
                trade_type=trade_type,
                trading_method=random.choice(trading_methods),
                asset_type=random.choice(asset_types),
                lot_size=random.randint(1, 10),
                entry_price=entry_price,
                exit_price=exit_price,
                pnl=pnl,
                broker_name="Interactive Brokers" if random.random() > 0.5 else "Alpaca"
            )
            session.add(trade)
        
        # Create key metrics
        metrics = KeyMetrics(
            timestamp=datetime.now(),
            total_pnl=portfolio_value - 10000.0,
            today_pnl=(random.random() - 0.5) * 200,
            active_strategies=random.randint(2, 5),
            total_trades_today=random.randint(5, 15),
            win_rate_last_7d=random.randint(50, 80) + random.random(),
            max_drawdown=random.randint(5, 15) + random.random()
        )
        session.add(metrics)
        
        # Commit all changes
        session.commit()
        
        print("Successfully migrated monitoring data.")

def migrate_all_data():
    """Migrate all mock data to the database."""
    print("Creating database tables...")
    create_db_and_tables()
    
    print("Migrating all mock data...")
    
    # Migrate datasets (using existing script)
    migrate_datasets()
    
    # Migrate strategies (using both old and new scripts)
    # The old script uses a different model than our actual application
    migrate_strategies()
    
    # Use our new migration script that matches the actual application model
    migrate_strategies_new()
    
    # Migrate agents (using both old and new scripts)
    # The old script uses a different model than our actual application
    migrate_agents()
    
    # Use our new migration script that matches the actual application model
    migrate_agents_new()
    
    # Migrate monitoring data
    migrate_monitoring_data()
    
    print("All mock data migration completed successfully.")

if __name__ == "__main__":
    migrate_all_data()