# backend/ai_agents/__init__.py
# This file makes the 'ai_agents' directory a Python package.

from .base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput
from .strategy_coding_agent import StrategyCodingAIAgent, GenerateStrategyInput, GenerateStrategyOutput, GeneratedStrategyCode
# Import other specific agent classes, inputs, and outputs as they are created
# from .execution_agent import ExecutionAIAgent, ExecuteTradeInput, ExecuteTradeOutput
# from .data_agent import DataFetchingAIAgent, FetchDataInput, FetchDataOutput
# from .analysis_agent import AnalysisAIAgent, AnalyzePortfolioInput, AnalyzePortfolioOutput


__all__ = [
    "PydanticAIAgent",
    "AgentTaskInput",
    "AgentTaskOutput",
    "StrategyCodingAIAgent",
    "GenerateStrategyInput",
    "GenerateStrategyOutput",
    "GeneratedStrategyCode",
    # Add other agent components to __all__
]
