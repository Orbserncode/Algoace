# backend/schemas.py
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Literal, Union, Dict, Any, ClassVar
from enum import Enum
from datetime import datetime

# --- Tool Definitions (Mirroring frontend) ---
class ToolNameEnum(str, Enum):
    MarketDataFetcher = 'MarketDataFetcher'
    TechnicalIndicatorCalculator = 'TechnicalIndicatorCalculator'
    WebSearcher = 'WebSearcher'
    PortfolioManager = 'PortfolioManager'
    OrderExecutor = 'OrderExecutor'
    Backtester = 'Backtester'
    NewsAnalyzer = 'NewsAnalyzer'
    RiskCalculator = 'RiskCalculator'

class ToolDefinition(BaseModel):
    name: ToolNameEnum
    description: str

available_tools: List[ToolDefinition] = [
    ToolDefinition(name=ToolNameEnum.MarketDataFetcher, description='Fetches historical and real-time market data for specified assets.'),
    ToolDefinition(name=ToolNameEnum.TechnicalIndicatorCalculator, description='Calculates various technical indicators (e.g., RSI, MACD, SMA).'),
    ToolDefinition(name=ToolNameEnum.WebSearcher, description='Performs web searches for news, analysis, or other relevant information (uses SerpAPI if configured).'),
    ToolDefinition(name=ToolNameEnum.PortfolioManager, description='Accesses current portfolio state, positions, and P&L.'),
    ToolDefinition(name=ToolNameEnum.OrderExecutor, description='Places, modifies, or cancels trades via a configured broker.'),
    ToolDefinition(name=ToolNameEnum.Backtester, description='Runs backtests on strategy code with specified parameters.'),
    ToolDefinition(name=ToolNameEnum.NewsAnalyzer, description='Analyzes news sentiment and relevance for specific assets or markets.'),
    ToolDefinition(name=ToolNameEnum.RiskCalculator, description='Calculates various risk metrics for portfolios and strategies.'),
]

# --- Agent Configuration Schemas (Pydantic) ---

class LogLevelEnum(str, Enum):
    debug = 'debug'
    info = 'info'
    warn = 'warn'
    error = 'error'

# Enum for agent types, mirrors models.AgentTypeEnum string values for discriminator
class AgentTypeEnumSchema(str, Enum):
    STRATEGY_CODING = 'Strategy Coding Agent'
    RESEARCH = 'Research & News Agent'
    PORTFOLIO = 'Portfolio Analyst Agent'
    RISK = 'Risk Manager Agent'
    EXECUTION = 'Execution Agent'
    BACKTEST_ANALYZER = 'Backtest Analyzer Agent' # Add this
    # Add a BASE type for the BaseAgentConfig if it can exist on its own
    BASE = 'Base Agent' 

class BaseAgentConfig(BaseModel):
    # Add agent_type discriminator to make parsing with discriminated unions more straightforward if needed,
    # though parse_agent_config currently handles it based on the agent's main type.
    # This field might be redundant if parse_agent_config is always used.
    agent_type: Literal[AgentTypeEnumSchema.BASE] = Field(AgentTypeEnumSchema.BASE, frozen=True, exclude=True) # Exclude from model_dump unless explicitly included
    logLevel: LogLevelEnum = Field(default='info', description="Logging verbosity for the agent.")
    enabledTools: List[ToolNameEnum] = Field(default_factory=list, description="List of tools this agent is permitted to use.")
    llmModelProviderId: Optional[str] = Field(default='groq', description="ID of the configured LLM provider to use.")
    llmModelName: Optional[str] = Field(default=None, description="Specific model name from the selected provider.")

    @field_validator('enabledTools', mode='before')
    @classmethod
    def validate_tool_names(cls, v):
        if not isinstance(v, list):
            raise ValueError('enabledTools must be a list')
        valid_tools = []
        for tool_name_str in v:
            try:
                valid_tools.append(ToolNameEnum(tool_name_str))
            except ValueError:
                raise ValueError(f"Invalid tool name: {tool_name_str}. Allowed tools are: {[e.value for e in ToolNameEnum]}")
        return valid_tools


class BacktestEngineEnum(str, Enum):
    lumibot = 'lumibot'
    vectorbt = 'vectorbt'
    internal_mock = 'internal_mock'

class StrategyCodingAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.STRATEGY_CODING] = Field(AgentTypeEnumSchema.STRATEGY_CODING, frozen=True)
    # LLM settings are now in BaseAgentConfig
    backtestEngine: BacktestEngineEnum = Field(default='lumibot', description="Engine to use for backtesting generated strategies.")
    generationPrompt: str = Field(
        default="You are an expert quantitative trading strategy developer specializing in Python and the Lumibot framework.\nGenerate a new trading strategy based on the provided market conditions, risk tolerance, and historical data context.\nThe strategy should be encapsulated in a Python class inheriting from lumibot.strategies.Strategy.\nInclude clear comments explaining the logic, parameters, entry/exit conditions, and risk management.\nOptimize for the specified risk tolerance: {riskTolerance}.\nCurrent Market Conditions: {marketConditions}.\nHistorical Context: {historicalData}.\nTarget Asset Class: {targetAssetClass}.\nCustom Requirements: {customRequirements}",
        min_length=50,
        description="System prompt for the strategy generation LLM. Use placeholders like {riskTolerance}, {marketConditions}, {historicalData}, {targetAssetClass}, {customRequirements}."
    )
    codingRetryAttempts: int = Field(default=2, ge=0, le=5, description="Number of attempts to generate and debug code if errors occur.")

class WatchedAsset(BaseModel):
    brokerId: str = Field(description="ID of the broker providing this asset.")
    symbol: str = Field(description="Asset symbol (e.g., AAPL, BTC/USD).")

class ResearchAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.RESEARCH] = Field(AgentTypeEnumSchema.RESEARCH, frozen=True)
    dataProviderConfigId: Optional[str] = Field(default=None, description="ID of a specific data provider configuration (e.g., a specific broker or direct API).")
    fetchFrequencyMinutes: int = Field(default=15, ge=1, le=1440, description="How often to fetch new market data, in minutes.")
    watchedAssets: List[WatchedAsset] = Field(default_factory=list, description="List of assets to monitor, potentially from multiple brokers. Min 1 if agent active.")
    useSerpApiForNews: bool = Field(default=False, description="Enable fetching news and sentiment via SerpAPI for watched assets.")
    researchPrompt: str = Field(
        default="Analyze the latest market news, trends, and data for the specified assets.\nIdentify key insights, potential trading opportunities, and relevant indicators.\nFocus on {watchedAssets} with particular attention to {focusAreas}.\nMarket Data: {marketData}\nRecent News: {recentNews}",
        description="Prompt for the research LLM. Use placeholders like {watchedAssets}, {focusAreas}, {marketData}, {recentNews}."
    )

class PortfolioAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.PORTFOLIO] = Field(AgentTypeEnumSchema.PORTFOLIO, frozen=True)
    analysisPrompt: str = Field(
        default="Analyze the portfolio's current performance, asset allocation, and recent trades.\nIdentify potential opportunities for rebalancing, diversification, or optimization.\nProvide actionable insights and recommendations for adjustments.\nPortfolio Metrics: {metrics}\nCurrent Allocation: {allocation}\nRecent Trades: {trades}",
        description="Prompt for the portfolio analysis LLM. Use placeholders like {metrics}, {allocation}, {trades}."
    )
    analysisFrequencyHours: int = Field(default=4, ge=1, le=24, description="How often to perform and report analysis, in hours.")
    targetAllocation: Dict[str, float] = Field(default_factory=dict, description="Target allocation percentages by asset class or symbol.")
    rebalanceThresholdPercent: float = Field(default=5.0, ge=0.1, le=20.0, description="Threshold percentage deviation from target allocation that triggers rebalance recommendations.")

class RiskAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.RISK] = Field(AgentTypeEnumSchema.RISK, frozen=True)
    riskAnalysisPrompt: str = Field(
        default="Analyze the portfolio's current risk exposure, compliance status, and market conditions.\nIdentify potential risks including drawdown, volatility, concentration, and regulatory concerns.\nProvide actionable risk mitigation recommendations.\nRisk Metrics: {riskMetrics}\nMarket Conditions: {marketConditions}\nCompliance Status: {complianceStatus}",
        description="Prompt for the risk analysis LLM. Use placeholders like {riskMetrics}, {marketConditions}, {complianceStatus}."
    )
    riskLimits: Dict[str, Any] = Field(default_factory=dict, description="Risk limits for various metrics (e.g., max drawdown, VaR, etc.).")
    complianceRules: List[str] = Field(default_factory=list, description="List of compliance rules to enforce.")
    analysisFrequencyHours: int = Field(default=2, ge=1, le=24, description="How often to perform and report risk analysis, in hours.")

class ExecutionAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.EXECUTION] = Field(AgentTypeEnumSchema.EXECUTION, frozen=True)
    brokerConfigId: Optional[str] = Field(default=None, description="ID of the configured broker to use for execution. Required if agent is active.") # Made optional, but active agents should have this.
    # LLM settings are now in BaseAgentConfig
    maxConcurrentTrades: int = Field(default=5, ge=1, le=20, description="Maximum number of trades the agent can manage simultaneously.")
    orderRetryAttempts: int = Field(default=3, ge=0, le=10, description="Number of times to retry placing an order if it fails.")
    executionLogicPrompt: Optional[str] = Field(
        default="You are an AI assistant for an automated trading Execution Agent.\nGiven the current market data, a proposed trade signal, and portfolio status, decide if the trade should proceed, be modified, or skipped.\nConsider factors like: extreme volatility, news events, current portfolio exposure, and confidence of the signal.\nTrade Signal: {tradeSignal}\nMarket Context: {marketContext}\nPortfolio Status: {portfolioStatus}\nYour decision (Proceed/Modify/Skip) and reasoning:",
        description="Optional prompt for AI-assisted execution adjustments. Use placeholders like {tradeSignal}, {marketContext}, {portfolioStatus}."
    )
    requiresAllAgentConfirmation: bool = Field(default=True, description="Requires explicit confirmation from relevant analysis/risk agents before executing a trade.")

class BacktestAnalyzerAgentConfig(BaseAgentConfig):
    agent_type: Literal[AgentTypeEnumSchema.BACKTEST_ANALYZER] = Field(AgentTypeEnumSchema.BACKTEST_ANALYZER, frozen=True)
    analysisPrompt: Optional[str] = Field(
        default="Analyze the provided backtest results: {summary_metrics}. Provide insights on performance, risk, and potential areas for improvement.",
        description="System prompt for the backtest analysis LLM. Use placeholder {summary_metrics}."
    )
    # Add any other specific configs for this agent if needed in the future

# Union for config types. BaseAgentConfig is included for default/unknown cases.
AgentConfigUnion = Union[StrategyCodingAgentConfig, ResearchAgentConfig, PortfolioAgentConfig, RiskAgentConfig, ExecutionAgentConfig, BacktestAnalyzerAgentConfig, BaseAgentConfig]


# --- Agent CRUD Schemas ---
# AgentTypeEnumSchema already defined above

# Enum for agent statuses, mirrors models.AgentStatusEnum string values
class AgentStatusEnumSchema(str, Enum):
    RUNNING = 'Running'
    IDLE = 'Idle'
    ERROR = 'Error'
    STOPPED = 'Stopped'


class AgentBase(BaseModel):
    name: str = Field(min_length=3, max_length=50)
    type: AgentTypeEnumSchema 
    description: str = Field(min_length=10, max_length=255)
    associatedStrategyIds: Optional[List[str]] = Field(default_factory=list)
    # config when creating/updating is a dictionary, which will be parsed.
    config: Optional[Dict[str, Any]] = Field(default_factory=dict) 

class AgentCreate(AgentBase):
    # isDefault is handled by the model's default if not provided
    isDefault: Optional[bool] = Field(default=False)
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=3, max_length=50)
    description: Optional[str] = Field(default=None, min_length=10, max_length=255)
    status: Optional[AgentStatusEnumSchema] = None
    config: Optional[Dict[str, Any]] = None # Input config is Dict
    associatedStrategyIds: Optional[List[str]] = None
    # isDefault typically shouldn't be updated after creation, but can be allowed
    isDefault: Optional[bool] = None


class AgentRead(AgentBase): # Inherits name, type, description, associatedStrategyIds
    id: int
    status: AgentStatusEnumSchema
    tasksCompleted: int
    errors: int
    isDefault: bool
    # config in AgentRead is the parsed Pydantic model union
    config: AgentConfigUnion 

    class Config:
        from_attributes = True


class AgentStatusUpdate(BaseModel):
    status: AgentStatusEnumSchema


# --- Utility for parsing config based on agent type ---
def parse_agent_config(agent_type_str: str, config_data: Optional[Dict[str, Any]]) -> AgentConfigUnion:
    config_data = config_data or {} # Ensure config_data is a dict

    # Add 'agent_type' to config_data if not already present, for discriminated union parsing
    # This helps if we were to use AgentConfigUnion.model_validate(config_data_with_type) directly.
    # However, the current explicit if/else based on agent_type_str is also clear.

    if agent_type_str == AgentTypeEnumSchema.STRATEGY_CODING.value:
        return StrategyCodingAgentConfig(**{'agent_type': AgentTypeEnumSchema.STRATEGY_CODING.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.RESEARCH.value:
        return ResearchAgentConfig(**{'agent_type': AgentTypeEnumSchema.RESEARCH.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.PORTFOLIO.value:
        return PortfolioAgentConfig(**{'agent_type': AgentTypeEnumSchema.PORTFOLIO.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.RISK.value:
        return RiskAgentConfig(**{'agent_type': AgentTypeEnumSchema.RISK.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.EXECUTION.value:
        return ExecutionAgentConfig(**{'agent_type': AgentTypeEnumSchema.EXECUTION.value, **config_data})
    elif agent_type_str == AgentTypeEnumSchema.BACKTEST_ANALYZER.value: # Add this block
        return BacktestAnalyzerAgentConfig(**{'agent_type': AgentTypeEnumSchema.BACKTEST_ANALYZER.value, **config_data})
    else:
        # Fallback to BaseAgentConfig for unknown or generic types
        # Or raise an error if the type is strictly one of the above.
        # For flexibility, let's assume a base config can exist.
        return BaseAgentConfig(**{'agent_type': AgentTypeEnumSchema.BASE.value, **config_data})


# --- Strategy Config Schemas ---

class StrategyConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    config_data: Dict[str, Any]
    strategy_id: Optional[str] = None
    performance_summary: Optional[str] = None

class StrategyConfigCreate(StrategyConfigBase):
    source: Literal["AI-Generated", "User-Saved"] = "User-Saved"
    
class StrategyConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    config_data: Optional[Dict[str, Any]] = None
    status: Optional[Literal["Active", "Archived"]] = None
    performance_summary: Optional[str] = None
    updated_at: Optional[datetime] = None

class StrategyConfigRead(StrategyConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    source: str
    status: str
    
    class Config:
        from_attributes = True
