# backend/ai_agents/backtest_analyzer.py
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from sqlmodel import Session

from .base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput, AgentDependencies
from backend.schemas import BacktestAnalyzerAgentConfig # To be created in schemas.py
from backend.models.agent import Agent as AgentModel # SQLModel Agent
# Assuming crud_backtest.py will have get_backtest_result
from backend import crud_backtest 
from backend.models.backtest import BacktestResult

class BacktestAnalysisInput(AgentTaskInput):
    backtest_result_id: Optional[int] = Field(default=None, description="ID of the backtest result to analyze.")
    summary_metrics: Optional[Dict[str, Any]] = Field(default=None, description="Direct summary metrics from a backtest.")
    
    # Ensure at least one input is provided
    @model_validator(mode='after')
    def check_input_provided(cls, values):
        if not values.backtest_result_id and not values.summary_metrics:
            raise ValueError("Either backtest_result_id or summary_metrics must be provided.")
        return values

class BacktestAnalysisOutput(AgentTaskOutput):
    analysis_text: Optional[str] = Field(default=None, description="Textual analysis of the backtest results.")
    analyzed_metrics: Optional[Dict[str, Any]] = Field(default=None, description="The metrics that were analyzed.")

class BacktestAnalyzerAIAgent(PydanticAIAgent[BacktestAnalysisInput, BacktestAnalysisOutput]):
    input_schema = BacktestAnalysisInput
    output_schema = BacktestAnalysisOutput

    def __init__(self, agent_model: AgentModel, session: Session): # session will be passed to super() and stored in dependencies
        super().__init__(agent_model, session) # PydanticAIAgent.__init__ handles config and dependencies
        if not isinstance(self.config, BacktestAnalyzerAgentConfig):
            self.log_message(f"Warning: Configuration is not of type BacktestAnalyzerAgentConfig. Got {type(self.config)}", level="warn")
            # Allow initialization even if config type is not specific, base config might be used.
            # Or, enforce strict type checking if preferred:
            # raise ValueError(f"Invalid configuration type for BacktestAnalyzerAIAgent. Expected BacktestAnalyzerAgentConfig, got {type(self.config)}")
        self.log_message("BacktestAnalyzerAIAgent initialized.")

    async def run(self, task_input: BacktestAnalysisInput) -> BacktestAnalysisOutput:
        self.log_message(f"Starting backtest analysis task with input: {task_input.model_dump_json(indent=2)}")
        
        metrics_to_analyze: Optional[Dict[str, Any]] = None
        
        if task_input.backtest_result_id:
            if not self.dependencies.database_session:
                return BacktestAnalysisOutput(success=False, message="Database session not available to fetch backtest results.", error_details="DB session missing.")
            
            db_result = crud_backtest.get_backtest_result(session=self.dependencies.database_session, backtest_id=task_input.backtest_result_id)
            if not db_result:
                return BacktestAnalysisOutput(success=False, message=f"Backtest result with ID {task_input.backtest_result_id} not found.")
            metrics_to_analyze = db_result.summary_metrics
        elif task_input.summary_metrics:
            metrics_to_analyze = task_input.summary_metrics
        
        if not metrics_to_analyze:
            # This case should ideally be caught by Pydantic validator in BacktestAnalysisInput
            return BacktestAnalysisOutput(success=False, message="No metrics provided for analysis.")

        # --- Basic Rule-Based Analysis (No LLM for this stub) ---
        analysis_parts = []
        net_profit = metrics_to_analyze.get("netProfit", 0.0)
        win_rate = metrics_to_analyze.get("winRate", 0.0) * 100 # Assuming winRate is 0.0 to 1.0
        total_trades = metrics_to_analyze.get("totalTrades", 0)
        max_drawdown = metrics_to_analyze.get("maxDrawdown", 0.0) * 100 # Assuming maxDrawdown is 0.0 to 1.0

        if net_profit > 0:
            analysis_parts.append(f"The strategy was profitable with a net profit of {net_profit:.2f}.")
        else:
            analysis_parts.append(f"The strategy was not profitable, with a net loss of {abs(net_profit):.2f}.")

        analysis_parts.append(f"It had a win rate of {win_rate:.2f}% over {total_trades} trades.")
        analysis_parts.append(f"The maximum drawdown was {max_drawdown:.2f}%.")

        if win_rate > 50 and net_profit > 0:
            analysis_parts.append("Overall, this appears to be a potentially viable strategy based on these basic metrics.")
        elif total_trades < 10:
            analysis_parts.append("Warning: The number of trades is very low, making the results less statistically significant.")
        else:
            analysis_parts.append("Further optimization or review may be needed for this strategy.")
        
        generated_analysis_text = " ".join(analysis_parts)
        
        self._update_agent_stats(success=True, session=self.dependencies.database_session)
        return BacktestAnalysisOutput(
            success=True,
            message="Backtest analysis completed.",
            analysis_text=generated_analysis_text,
            analyzed_metrics=metrics_to_analyze
        )

# Need to ensure pydantic @model_validator is imported if used in AgentTaskInput
from pydantic import model_validator
