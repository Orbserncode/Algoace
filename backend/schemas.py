# backend/schemas.py
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Literal, Union, Dict, Any
from enum import Enum

# --- Tool Definitions (Mirroring frontend) ---
class ToolNameEnum(str, Enum):
    MarketDataFetcher = 'MarketDataFetcher'
    TechnicalIndicatorCalculator = 'TechnicalIndicatorCalculator'
    WebSearcher = 'WebSearcher'
    PortfolioManager = 'PortfolioManager'
    OrderExecutor = 'OrderExecutor'
    Backtester = 'Backtester'

class ToolDefinition(BaseModel):
    name: ToolNameEnum
    description: str

# This list should be kept in sync with frontend's availableTools
available_tools: List[ToolDefinition] = [
    ToolDefinition(name='MarketDataFetcher', description='Fetches historical and real-time market data for specified assets.'),
    ToolDefinition(name='TechnicalIndicatorCalculator', description='Calculates various technical indicators (e.g., RSI, MACD, SMA).'),
    ToolDefinition(name='WebSearcher', description='Performs web searches for news, analysis, or other relevant information (uses SerpAPI if configured).'),
    ToolDefinition(name='PortfolioManager', description='Accesses current portfolio state, positions, and P&L.'),
    ToolDefinition(name='OrderExecutor', description='Places, modifies, or cancels trades via a configured broker.'),
    ToolDefinition(name='Backtester', description='Runs backtests on strategy code with specified parameters.'),
]

# --- Agent Configuration Schemas (Pydantic) ---

class LogLevelEnum(str, Enum):
    debug = 'debug'
    info = 'info'
    warn = 'warn'
    error = 'error'

class BaseAgentConfig(BaseModel):
    logLevel: LogLevelEnum = Field(default='info', description="Logging verbosity for the agent.")
    enabledTools: Optional[List[ToolNameEnum]] = Field(default_factory=list, description="List of tools this agent is permitted to use.")

class BacktestEngineEnum(str, Enum):
    lumibot = 'lumibot'
    vectorbt = 'vectorbt'
    internal_mock = 'internal_mock'

class StrategyCodingAgentConfig(BaseAgentConfig):
    agent_type: Literal['Strategy Coding Agent'] = Field('Strategy Coding Agent', frozen=True)
    llmModelProviderId: Optional[str] = Field(default=None, description="ID of the configured LLM provider to use.")
    llmModelName: Optional[str] = Field(default=None, description="Specific model name from the selected provider (e.g., gemini-2.0-flash, gpt-4-turbo).")
    backtestEngine: BacktestEngineEnum = Field(default='lumibot', description="Engine to use for backtesting generated strategies.")
    generationPrompt: str = Field(
        default="You are an expert quantitative trading strategy developer specializing in Python and the Lumibot framework.\nGenerate a new trading strategy based on the provided market conditions, risk tolerance, and historical data context.\nThe strategy should be encapsulated in a Python class inheriting from lumibot.strategies.Strategy.\nInclude clear comments explaining the logic, parameters, entry/exit conditions, and risk management.\nOptimize for the specified risk tolerance: {riskTolerance}.\nCurrent Market Conditions: {marketConditions}.\nHistorical Context: {historicalData}",
        min_length=50,
        description="System prompt for the strategy generation LLM. Use placeholders like {riskTolerance}, {marketConditions}, {historicalData}."
    )
    codingRetryAttempts: int = Field(default=2, ge=0, le=5, description="Number of attempts to generate and debug code if errors occur.")

class ExecutionAgentConfig(BaseAgentConfig):
    agent_type: Literal['Execution Agent'] = Field('Execution Agent', frozen=True)
    brokerConfigId: str = Field(description="ID of the configured broker to use for execution.")
    llmModelProviderId: Optional[str] = Field(default=None, description="ID of the LLM provider for dynamic execution adjustments (optional).")
    llmModelName: Optional[str] = Field(default=None, description="Specific model name for execution adjustments (optional).")
    maxConcurrentTrades: int = Field(default=5, ge=1, le=20, description="Maximum number of trades the agent can manage simultaneously.")
    orderRetryAttempts: int = Field(default=3, ge=0, le=10, description="Number of times to retry placing an order if it fails.")
    executionLogicPrompt: Optional[str] = Field(
        default="You are an AI assistant for an automated trading Execution Agent.\nGiven the current market data, a proposed trade signal, and portfolio status, decide if the trade should proceed, be modified, or skipped.\nConsider factors like: extreme volatility, news events, current portfolio exposure, and confidence of the signal.\nTrade Signal: {tradeSignal}\nMarket Context: {marketContext}\nPortfolio Status: {portfolioStatus}\nYour decision (Proceed/Modify/Skip) and reasoning:",
        description="Optional prompt for AI-assisted execution adjustments. Use placeholders like {tradeSignal}, {marketContext}, {portfolioStatus}."
    )
    requiresAllAgentConfirmation: bool = Field(default=True, description="Requires explicit confirmation from relevant analysis/risk agents before executing a trade.")

class WatchedAsset(BaseModel):
    brokerId: str = Field(description="ID of the broker providing this asset.")
    symbol: str = Field(description="Asset symbol (e.g., AAPL, BTC/USD).")

class DataAgentConfig(BaseAgentConfig):
    agent_type: Literal['Data Agent'] = Field('Data Agent', frozen=True)
    dataProviderConfigId: Optional[str] = Field(default=None, description="ID of a specific data provider configuration (e.g., a specific broker or direct API).")
    fetchFrequencyMinutes: int = Field(default=15, ge=1, le=1440, description="How often to fetch new market data, in minutes.")
    watchedAssets: List[WatchedAsset] = Field(default_factory=list, min_length=1, description="List of assets to monitor, potentially from multiple brokers.")
    useSerpApiForNews: bool = Field(default=False, description="Enable fetching news and sentiment via SerpAPI for watched assets.")

class AnalysisAgentConfig(BaseAgentConfig):
    agent_type: Literal['Analysis Agent'] = Field('Analysis Agent', frozen=True)
    llmModelProviderId: Optional[str] = Field(default=None, description="ID of the configured LLM provider to use.")
    llmModelName: Optional[str] = Field(default=None, description="Specific model name from the selected provider.")
    analysisPrompt: str = Field(
        default="Analyze the portfolio's current performance, risk exposure, and recent trades.\nIdentify potential issues like high drawdown, concentration risk, or strategy underperformance.\nProvide actionable insights and recommendations for adjustments.\nPortfolio Metrics: {metrics}\nRecent Trades: {trades}\nMarket News/Sentiment: {marketNews}",
        description="Prompt for the analysis LLM. Use placeholders like {metrics}, {trades}, {marketNews}."
    )
    analysisFrequencyHours: int = Field(default=4, ge=1, le=24, description="How often to perform and report analysis, in hours.")

AgentConfigUnion = Union[StrategyCodingAgentConfig, ExecutionAgentConfig, DataAgentConfig, AnalysisAgentConfig, BaseAgentConfig]


# --- Agent CRUD Schemas ---
# Enum for agent types, mirrors models.AgentTypeEnum string values
class AgentTypeEnumSchema(str, Enum):
    STRATEGY_CODING = 'Strategy Coding Agent'
    EXECUTION = 'Execution Agent'
    DATA = 'Data Agent'
    ANALYSIS = 'Analysis Agent'

# Enum for agent statuses, mirrors models.AgentStatusEnum string values
class AgentStatusEnumSchema(str, Enum):
    RUNNING = 'Running'
    IDLE = 'Idle'
    ERROR = 'Error'
    STOPPED = 'Stopped'


class AgentBase(BaseModel):
    name: str = Field(min_length=3, max_length=50)
    type: AgentTypeEnumSchema # Use the schema enum here
    description: str = Field(min_length=10, max_length=255)
    associatedStrategyIds: Optional[List[str]] = Field(default_factory=list)
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=3, max_length=50)
    description: Optional[str] = Field(default=None, min_length=10, max_length=255)
    status: Optional[AgentStatusEnumSchema] = None # Use schema enum
    config: Optional[Dict[str, Any]] = None
    associatedStrategyIds: Optional[List[str]] = None

class AgentRead(AgentBase):
    id: int # Changed from str to int to match SQLModel ID type
    status: AgentStatusEnumSchema # Use schema enum
    tasksCompleted: int
    errors: int
    isDefault: bool
    config: Optional[AgentConfigUnion] 

    class Config:
        from_attributes = True # Replaces orm_mode for Pydantic v2


class AgentStatusUpdate(BaseModel):
    status: AgentStatusEnumSchema


# --- Utility for parsing config based on agent type ---
def parse_agent_config(agent_type_str: str, config_data: Optional[Dict[str, Any]]) -> AgentConfigUnion:
    config_data = config_data or {} # Ensure config_data is a dict

    # Ensure 'agent_type' field is present in config_data if it's part of the specific config schema
    # This is important because the discriminated union relies on this field.
    # However, our base models don't all have it. We'll map based on agent_type_str.

    if agent_type_str == AgentTypeEnumSchema.STRATEGY_CODING.value:
        # Add agent_type to the data if not present, for validation
        return StrategyCodingAgentConfig(**{'agent_type': AgentTypeEnumSchema.STRATEGY_CODING.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.EXECUTION.value:
        return ExecutionAgentConfig(**{'agent_type': AgentTypeEnumSchema.EXECUTION.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.DATA.value:
        return DataAgentConfig(**{'agent_type': AgentTypeEnumSchema.DATA.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.ANALYSIS.value:
        return AnalysisAgentConfig(**{'agent_type': AgentTypeEnumSchema.ANALYSIS.value, **config_data})
    else:
        # This case should ideally not be reached if agent_type_str is always valid
        # Fallback to BaseAgentConfig if type is unknown or for generic agents
        return BaseAgentConfig(**config_data)

