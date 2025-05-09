"""
Simple FastAPI application for AlgoAce Trader.
This file is designed to be run directly with uvicorn.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
# Import scheduler function
try:
    # When running as a module from project root
    from backend.scheduler import run_scheduler_on_startup
except ImportError:
    # When running directly from backend directory
    from scheduler import run_scheduler_on_startup

# Define lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    print("FastAPI application starting up...")
    # In a real application, we would initialize the database here
    # For now, we'll just print a message
    # Create database tables
    try:
        try:
            # When running as a module from project root
            from backend.database import create_db_and_tables
            create_db_and_tables()
            print("Database check/creation complete.")
        except ImportError:
            # When running directly from backend directory
            from database import create_db_and_tables
            create_db_and_tables()
            print("Database check/creation complete.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
    
    # Start the scheduler for automated strategy generation
    try:
        run_scheduler_on_startup()
        print("Strategy generation scheduler started.")
    except Exception as e:
        print(f"Error starting scheduler: {e}")

    yield # Application runs here

    # --- Shutdown ---
    print("FastAPI application shutting down...")

# Create the FastAPI app instance with the lifespan manager
app = FastAPI(
    title="AlgoAce Trader API",
    description="Backend API for the multi-agent hedge fund trading platform.",
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
# Allow requests from your Next.js frontend development server
origins = [
    "http://localhost:9002", # Default Next.js dev port specified in package.json
    "http://localhost:3000", # Common alternative Next.js port
    "https://*.app.github.dev", # GitHub Codespace URLs
    "*", # Allow all origins for testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- Include Routers ---
try:
    # When running as a module from project root
    from backend.api import datasets, recommendations, monitoring, agents, strategies, backtesting
    from backend.api import file_based_agents, file_based_strategies
except ImportError:
    # When running directly from backend directory
    from api import datasets, recommendations, monitoring, agents, strategies, backtesting
    from api import file_based_agents, file_based_strategies

# Include the datasets router
app.include_router(datasets.router)

# Include the recommendations router
app.include_router(recommendations.router)

# Include the monitoring router
app.include_router(monitoring.router, prefix="/monitoring")

# Include the agents router (database-based)
app.include_router(agents.router)

# Include the file-based agents router (reads from Python files)
app.include_router(file_based_agents.router)

# Include the strategies router (database-based)
app.include_router(strategies.router)

# Include the file-based strategies router (reads from Python files)
app.include_router(file_based_strategies.router)

# Include the backtesting router
app.include_router(backtesting.router)

# --- Root Endpoint ---
@app.get("/")
async def root():
    return {"message": "Welcome to the AlgoAce Trader API"}

# --- Agents Endpoints ---
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Agent Models
class AgentBase(BaseModel):
    name: str
    type: str
    description: str
    status: str = "Idle"
    tasksCompleted: int = 0
    errors: int = 0
    isDefault: bool = False
    associatedStrategyIds: List[str] = []
    config: Optional[Dict[str, Any]] = None

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    associatedStrategyIds: Optional[List[str]] = None

class Agent(AgentBase):
    id: str

# Mock data for agents
mock_agents = [
    {
        "id": "agent-research-1",
        "name": "Research Agent",
        "type": "Research & News Agent",
        "status": "Idle",
        "description": "Analyzes market news and data",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": []
    },
    {
        "id": "agent-portfolio-1",
        "name": "Portfolio Agent",
        "type": "Portfolio Analyst Agent",
        "status": "Idle",
        "description": "Manages portfolio allocation",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": []
    },
    {
        "id": "agent-risk-1",
        "name": "Risk Agent",
        "type": "Risk Manager Agent",
        "status": "Idle",
        "description": "Monitors risk metrics",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": []
    },
    {
        "id": "agent-execution-1",
        "name": "Execution Agent",
        "type": "Execution Agent",
        "status": "Idle",
        "description": "Executes trades",
        "tasksCompleted": 0,
        "errors": 0,
        "isDefault": True,
        "associatedStrategyIds": []
    }
]

# Mock agent configurations
mock_agent_configs = {
    "agent-research-1": {
        "logLevel": "info",
        "enabledTools": ["MarketDataFetcher", "WebSearcher"],
        "llmModelProviderId": "llm-google-default",
        "llmModelName": "gemini-2.0-flash",
        "dataProviderConfigId": "broker-alpaca-paper",
        "fetchFrequencyMinutes": 15,
        "watchedAssets": [{"brokerId": "broker-alpaca-paper", "symbol": "AAPL"}],
        "useSerpApiForNews": True,
        "researchPrompt": "Analyze the latest market news, trends, and data for the specified assets."
    },
    "agent-portfolio-1": {
        "logLevel": "info",
        "enabledTools": ["PortfolioManager", "MarketDataFetcher"],
        "llmModelProviderId": "llm-google-default",
        "llmModelName": "gemini-2.0-flash",
        "analysisPrompt": "Analyze the portfolio's current performance, asset allocation, and recent trades.",
        "analysisFrequencyHours": 4,
        "targetAllocation": {"SPY": 0.6, "QQQ": 0.3, "BONDS": 0.1},
        "rebalanceThresholdPercent": 5.0
    },
    "agent-risk-1": {
        "logLevel": "info",
        "enabledTools": ["PortfolioManager", "RiskCalculator"],
        "llmModelProviderId": "llm-google-default",
        "llmModelName": "gemini-2.0-flash",
        "riskAnalysisPrompt": "Analyze the portfolio's current risk exposure, compliance status, and market conditions.",
        "riskLimits": {"maxDrawdown": 0.15, "var95": 0.03},
        "complianceRules": ["No single asset should exceed 20% of portfolio value"],
        "analysisFrequencyHours": 2
    },
    "agent-execution-1": {
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

@app.get("/agents", response_model=List[Agent])
async def list_agents():
    """List all agents."""
    return mock_agents

@app.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Get a specific agent by ID."""
    agent = next((a for a in mock_agents if a["id"] == agent_id), None)
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
    return agent

@app.get("/agents/{agent_id}/config")
async def get_agent_config(agent_id: str):
    """Get configuration for a specific agent."""
    if agent_id not in mock_agent_configs:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Configuration for agent with ID {agent_id} not found")
    return mock_agent_configs[agent_id]

@app.put("/agents/{agent_id}/config")
async def update_agent_config(agent_id: str, config: Dict[str, Any]):
    """Update configuration for a specific agent."""
    agent = next((a for a in mock_agents if a["id"] == agent_id), None)
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
    
    mock_agent_configs[agent_id] = config
    return config

@app.post("/agents/{agent_id}/activate")
async def activate_agent(agent_id: str):
    """Activate an agent."""
    agent = next((a for a in mock_agents if a["id"] == agent_id), None)
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
    
    agent["status"] = "Running"
    return agent

@app.post("/agents/{agent_id}/deactivate")
async def deactivate_agent(agent_id: str):
    """Deactivate an agent."""
    agent = next((a for a in mock_agents if a["id"] == agent_id), None)
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
    
    agent["status"] = "Stopped"
    return agent

@app.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent."""
    global mock_agents
    agent = next((a for a in mock_agents if a["id"] == agent_id), None)
    if agent is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Agent with ID {agent_id} not found")
    
    if agent["isDefault"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Cannot delete a default agent")
    
    mock_agents = [a for a in mock_agents if a["id"] != agent_id]
    if agent_id in mock_agent_configs:
        del mock_agent_configs[agent_id]
    
    return {"success": True}

@app.post("/agents", response_model=Agent)
async def create_agent(agent: AgentCreate):
    """Create a new agent."""
    import time
    agent_id = f"agent-{int(time.time())}"
    new_agent = {
        "id": agent_id,
        **agent.model_dump()
    }
    mock_agents.append(new_agent)
    
    # Create default config based on agent type
    if agent.type == "Research & News Agent":
        mock_agent_configs[agent_id] = {
            "logLevel": "info",
            "enabledTools": ["MarketDataFetcher", "WebSearcher"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "dataProviderConfigId": "broker-alpaca-paper",
            "fetchFrequencyMinutes": 15,
            "watchedAssets": [{"brokerId": "broker-alpaca-paper", "symbol": "SPY"}],
            "useSerpApiForNews": False,
            "researchPrompt": "Analyze the latest market news, trends, and data for the specified assets."
        }
    elif agent.type == "Portfolio Analyst Agent":
        mock_agent_configs[agent_id] = {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "MarketDataFetcher"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "analysisPrompt": "Analyze the portfolio's current performance, asset allocation, and recent trades.",
            "analysisFrequencyHours": 4,
            "targetAllocation": {},
            "rebalanceThresholdPercent": 5.0
        }
    elif agent.type == "Risk Manager Agent":
        mock_agent_configs[agent_id] = {
            "logLevel": "info",
            "enabledTools": ["PortfolioManager", "RiskCalculator"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "riskAnalysisPrompt": "Analyze the portfolio's current risk exposure, compliance status, and market conditions.",
            "riskLimits": {},
            "complianceRules": [],
            "analysisFrequencyHours": 2
        }
    elif agent.type == "Execution Agent":
        mock_agent_configs[agent_id] = {
            "logLevel": "info",
            "enabledTools": ["OrderExecutor", "PortfolioManager"],
            "llmModelProviderId": "llm-google-default",
            "llmModelName": "gemini-2.0-flash",
            "brokerConfigId": "",
            "maxConcurrentTrades": 5,
            "orderRetryAttempts": 3,
            "executionLogicPrompt": "You are an AI assistant for an automated trading Execution Agent.",
            "requiresAllAgentConfirmation": True
        }
    else:
        mock_agent_configs[agent_id] = {
            "logLevel": "info",
            "enabledTools": []
        }
    
    return new_agent

# --- Strategies Endpoints ---
class StrategyBase(BaseModel):
    name: str
    description: str
    status: str
    source: Optional[str] = None
    file_name: Optional[str] = None
    pnl: float = 0.0
    win_rate: float = 0.0

class StrategyCreate(StrategyBase):
    pass

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    file_name: Optional[str] = None
    pnl: Optional[float] = None
    win_rate: Optional[float] = None

class Strategy(StrategyBase):
    id: str

# Mock data for strategies
mock_strategies = [
    {
        "id": "strat-001",
        "name": "Moving Average Crossover",
        "description": "Simple moving average crossover strategy",
        "status": "Active",
        "source": "Uploaded",
        "file_name": "ema_cross_strategy.py",
        "pnl": 1250.75,
        "win_rate": 65.2
    },
    {
        "id": "strat-002",
        "name": "RSI Oscillator",
        "description": "RSI-based mean reversion strategy",
        "status": "Inactive",
        "source": "Uploaded",
        "file_name": "rsi_mean_reversion.py",
        "pnl": -340.10,
        "win_rate": 48.9
    },
    {
        "id": "strat-003",
        "name": "AI Trend Follower V2",
        "description": "Uses ML to identify and follow trends (updated).",
        "status": "Active",
        "source": "AI-Generated",
        "pnl": 3105.00,
        "win_rate": 72.1
    }
]

# Mock strategy code
mock_strategy_code = {
    "strat-001": "# EMA Cross Strategy Code\nfrom lumibot.strategies.strategy import Strategy\n\nclass EmaCrossStrategy(Strategy):\n    def initialize(self):\n        self.sleeptime = '1D'\n        # Strategy initialization code...",
    "strat-002": "# RSI Mean Reversion Strategy Code\nfrom lumibot.strategies.strategy import Strategy\n\nclass RsiMeanReversion(Strategy):\n    def initialize(self):\n        self.sleeptime = '1H'\n        # Strategy initialization code...",
    "strat-003": "# AI Trend Follower V2 Code\nfrom lumibot.strategies.strategy import Strategy\n\nclass AITrendFollowerV2(Strategy):\n    def initialize(self):\n        self.sleeptime = '15M'\n        # Strategy initialization code..."
}

@app.get("/strategies", response_model=List[Strategy])
async def list_strategies(include_archived: bool = False):
    """List all strategies."""
    if not include_archived:
        return [s for s in mock_strategies if s["status"] != "Archived"]
    return mock_strategies

@app.get("/strategies/{strategy_id}", response_model=Strategy)
async def get_strategy(strategy_id: str):
    """Get a specific strategy by ID."""
    strategy = next((s for s in mock_strategies if s["id"] == strategy_id), None)
    if strategy is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Strategy with ID {strategy_id} not found")
    return strategy

@app.get("/strategies/{strategy_id}/code")
async def get_strategy_code(strategy_id: str):
    """Get code for a specific strategy."""
    if strategy_id not in mock_strategy_code:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Code for strategy with ID {strategy_id} not found")
    return {"code": mock_strategy_code[strategy_id]}

@app.post("/strategies", response_model=Strategy)
async def create_strategy(strategy: StrategyCreate):
    """Create a new strategy."""
    import time
    strategy_id = f"strat-{int(time.time())}"
    new_strategy = {
        "id": strategy_id,
        **strategy.model_dump()
    }
    mock_strategies.append(new_strategy)
    return new_strategy

@app.put("/strategies/{strategy_id}", response_model=Strategy)
async def update_strategy(strategy_id: str, strategy_update: StrategyUpdate):
    """Update a strategy."""
    strategy = next((s for s in mock_strategies if s["id"] == strategy_id), None)
    if strategy is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Strategy with ID {strategy_id} not found")
    
    update_data = strategy_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        strategy[key] = value
    
    return strategy

@app.delete("/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a strategy."""
    global mock_strategies
    strategy = next((s for s in mock_strategies if s["id"] == strategy_id), None)
    if strategy is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Strategy with ID {strategy_id} not found")
    
    mock_strategies = [s for s in mock_strategies if s["id"] != strategy_id]
    if strategy_id in mock_strategy_code:
        del mock_strategy_code[strategy_id]
    
    return {"success": True}

@app.post("/strategies/{strategy_id}/code")
async def save_strategy_code(strategy_id: str, code_data: Dict[str, str]):
    """Save code for a specific strategy."""
    strategy = next((s for s in mock_strategies if s["id"] == strategy_id), None)
    if strategy is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Strategy with ID {strategy_id} not found")
    
    mock_strategy_code[strategy_id] = code_data.get("code", "")
    return {"success": True}

@app.post("/strategies/schedule-generation")
async def schedule_strategy_generation(schedule_type: str, generation_config: dict):
    """
    Schedule automated strategy generation.
    
    - schedule_type: 'startup', 'daily', or 'weekly'
    - generation_config: Configuration for the strategy generation
    """
    import time
    
    # Create a new strategy with scheduled generation
    strategy_id = f"strat-sched-{int(time.time())}"
    new_strategy = {
        "id": strategy_id,
        "name": f"Scheduled {schedule_type.capitalize()} Strategy",
        "description": f"Automatically generated strategy with {schedule_type} schedule",
        "status": "Inactive",
        "source": "AI-Generated",
        "pnl": 0.0,
        "win_rate": 0.0,
        "generation_schedule": schedule_type,
        "last_generation_time": None,  # Will be set when first generated
        "generation_config": generation_config
    }
    
    mock_strategies.append(new_strategy)
    
    return {
        "message": f"Strategy generation scheduled with {schedule_type} frequency",
        "strategy_id": strategy_id
    }

@app.post("/strategies/run-scheduled-generations")
async def run_scheduled_generations():
    """
    Trigger execution of all scheduled strategy generations that are due.
    """
    from datetime import datetime, timedelta
    
    results = []
    now = datetime.now().isoformat()
    
    for strategy in mock_strategies:
        if "generation_schedule" not in strategy or not strategy["generation_schedule"]:
            continue
            
        # In a real implementation, we would check if generation is due based on schedule
        # For now, just simulate a successful generation
        
        # Update last generation time
        strategy["last_generation_time"] = now
        
        results.append({
            "strategy_id": strategy["id"],
            "name": strategy["name"],
            "schedule": strategy["generation_schedule"],
            "status": "Generation triggered"
        })
    
    return {
        "message": f"Processed {len(results)} scheduled generations",
        "results": results
    }

# --- Settings Endpoints ---
@app.get("/settings/llm-providers")
async def get_llm_providers():
    """Get configured LLM providers."""
    return [
        {"id": "llm-google-default", "providerType": "google", "modelName": "gemini-2.0-flash"},
        {"id": "llm-openai-default", "providerType": "openai", "modelName": "gpt-4-turbo"},
        {"id": "llm-local-ollama", "providerType": "local", "apiUrl": "http://localhost:11434", "modelName": "llama3"}
    ]

@app.get("/settings/llm-models/{provider_type}")
async def get_llm_models(provider_type: str):
    """Get available LLM models for a provider type."""
    if provider_type == "google":
        return ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro"]
    elif provider_type == "openai":
        return ["gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"]
    elif provider_type == "local":
        return ["llama3", "mistral", "mixtral"]
    else:
        return []

@app.get("/settings/brokers")
async def get_brokers():
    """Get configured brokers."""
    return [
        {"id": "broker-alpaca-paper", "brokerType": "alpaca", "paperTrading": True},
        {"id": "broker-alpaca-live", "brokerType": "alpaca", "paperTrading": False},
        {"id": "broker-ib-paper", "brokerType": "interactive_brokers", "paperTrading": True}
    ]

@app.get("/broker/{broker_id}/assets")
async def get_broker_assets(broker_id: str):
    """Get available assets for a broker."""
    common_assets = ["SPY", "QQQ", "AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "BRK.B"]
    crypto_assets = ["BTC/USD", "ETH/USD", "SOL/USD", "ADA/USD", "DOT/USD"]
    
    if "alpaca" in broker_id:
        return common_assets + crypto_assets if "paper" in broker_id else common_assets
    elif "ib" in broker_id:
        return common_assets
    else:
        return []

# --- Run with Uvicorn (for local development) ---
# Use the command: uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
# The command is typically run from the project root directory.
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)