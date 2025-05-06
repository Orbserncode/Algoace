# backend/ai_agents/strategy_coding_agent.py
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from sqlmodel import Session

from .base_agent import PydanticAIAgentWrapper, AgentTaskInput, AgentTaskOutput
from backend import schemas, models, crud
# Assuming Genkit flows are defined and can be imported/called
# For example, if you have a Genkit flow for generating strategy code:
# from src.ai.flows.generate_strategy_code_flow import generateStrategyCode, GenerateStrategyCodeInput
# For now, we'll simulate this interaction.

class GenerateStrategyInput(AgentTaskInput):
    market_conditions: str = Field(description="Current market conditions (e.g., bullish, bearish, volatile).")
    risk_tolerance: schemas.AgentConfigUnion = Field(description="User's risk tolerance level (low, medium, high).") # Placeholder, should align with a defined Enum
    historical_data_summary: Optional[str] = Field(default=None, description="Summary of relevant historical data patterns.")
    custom_requirements: Optional[str] = Field(default=None, description="Any specific custom requirements for the strategy.")
    target_asset_class: Optional[str] = Field(default="stocks", description="Target asset class (e.g., stocks, crypto, forex).")

class GenerateStrategyOutput(AgentTaskOutput):
    generated_code: Optional[str] = None
    strategy_name_suggestion: Optional[str] = None
    backtest_summary: Optional[Dict[str, Any]] = None # Placeholder for brief backtest results

class StrategyCodingAIAgent(PydanticAIAgentWrapper[GenerateStrategyInput, GenerateStrategyOutput]):
    input_schema = GenerateStrategyInput
    output_schema = GenerateStrategyOutput
    # genkit_flow_name = "generateStrategyCodeFlow" # Example, if using a Genkit flow directly

    def __init__(self, agent_model: models.Agent, session: Session):
        super().__init__(agent_model, session)
        if not isinstance(self.config, schemas.StrategyCodingAgentConfig):
            raise ValueError("Invalid configuration type for StrategyCodingAIAgent.")
        self.log_message("StrategyCodingAIAgent initialized.")


    async def run(self, task_input: GenerateStrategyInput, session: Session) -> GenerateStrategyOutput:
        self.log_message(f"Starting strategy generation task with input: {task_input.model_dump_json(indent=2)}")

        if not self.config.llmModelProviderId or not self.config.llmModelName:
            self.log_message("LLM provider or model name not configured for strategy generation.", level="error")
            self._update_agent_stats(success=False, session=session)
            return GenerateStrategyOutput(success=False, message="LLM not configured for strategy generation.")

        # Construct prompt for Genkit based on self.config.generationPrompt and task_input
        # This is a simplified example. A real implementation would use Genkit's definePrompt and call it.
        
        # Example of preparing input for a hypothetical Genkit flow
        # genkit_input = GenerateStrategyCodeInput( # This type would come from your Genkit flow definition
        #     generation_prompt_template=self.config.generationPrompt,
        #     market_conditions=task_input.market_conditions,
        #     risk_tolerance=task_input.risk_tolerance,
        #     historical_data_summary=task_input.historical_data_summary,
        #     custom_requirements=task_input.custom_requirements,
        #     target_asset_class=task_input.target_asset_class,
        #     # Pass LLM model info if the flow expects it, or rely on Genkit's default/config
        #     # llm_model_name=self.config.llmModelName 
        # )
        
        # MOCK Genkit flow call
        self.log_message(f"Simulating Genkit call to model {self.config.llmModelName} via provider {self.config.llmModelProviderId}...")
        await asyncio.sleep(2) # Simulate network delay for LLM call

        # Mocked successful response
        mock_generated_code = f"""
# Strategy: AI Generated Trend Follower for {task_input.target_asset_class}
# Market Conditions: {task_input.market_conditions}
# Risk Tolerance: {task_input.risk_tolerance}

from lumibot.strategies.strategy import Strategy
from lumibot.entities import Asset

class AIGeneratedStrategy(Strategy):
    parameters = {{
        "symbol": "AAPL", # Placeholder, should be dynamic or part of input
        "sma_short": 10,
        "sma_long": 30,
    }}

    def initialize(self):
        self.sleeptime = "1D"
        self.main_asset = Asset(symbol=self.parameters["symbol"], asset_type="stock")
        self.log_message("AI Generated Strategy Initialized.")

    def on_trading_iteration(self):
        # Basic SMA Crossover Logic - replace with actual generated logic
        data = self.get_historical_prices(self.main_asset, self.parameters["sma_long"] + 1, "day")
        if data is None or data.empty:
            return
        
        sma_short = data["close"].rolling(window=self.parameters["sma_short"]).mean()
        sma_long = data["close"].rolling(window=self.parameters["sma_long"]).mean()

        if sma_short.iloc[-1] > sma_long.iloc[-1] and sma_short.iloc[-2] < sma_long.iloc[-2]:
            if self.get_position(self.main_asset) is None:
                order = self.create_order(self.main_asset, 10, "buy") # Example quantity
                self.submit_order(order)
                self.log_message(f"BUY signal for {{self.parameters['symbol']}}")
        elif sma_short.iloc[-1] < sma_long.iloc[-1] and sma_short.iloc[-2] > sma_long.iloc[-2]:
            if self.get_position(self.main_asset) is not None:
                self.sell_all()
                self.log_message(f"SELL signal for {{self.parameters['symbol']}}")
"""
        mock_strategy_name = f"AI Strategy for {task_input.target_asset_class} ({task_input.risk_tolerance} risk)"

        # TODO: Implement actual backtesting call here (could be another agent or service)
        # For now, mock backtesting results
        mock_backtest_summary = {
            "net_profit": (1000 * (0.5 if task_input.risk_tolerance == "low" else 1 if task_input.risk_tolerance == "medium" else 1.5)),
            "win_rate": 0.55 + (0.1 if task_input.risk_tolerance == "high" else 0),
            "total_trades": 50 + (20 if task_input.risk_tolerance == "medium" else 0),
        }
        
        # After successful generation and (mock) backtesting:
        # 1. Save the strategy to the database
        try:
            new_strategy_db = crud.create_strategy(session=session, strategy_in=models.StrategyCreate(
                name=mock_strategy_name,
                description=f"AI-Generated strategy based on: {task_input.market_conditions}, risk: {task_input.risk_tolerance}.",
                status='Inactive', # Start as inactive
                source='AI-Generated',
                # pnl and win_rate would come from actual backtest results
                pnl=mock_backtest_summary["net_profit"],
                win_rate=mock_backtest_summary["win_rate"] * 100, # Assuming win_rate is decimal 0-1
            ))
            # TODO: Store the generated_code with the strategy (e.g., in a file system or DB LOB)
            # For now, we're just returning it in the output.
            self.log_message(f"Successfully generated and saved new strategy: {new_strategy_db.name} (ID: {new_strategy_db.id})")
        except Exception as e:
            self.log_message(f"Error saving generated strategy to database: {e}", level="error")
            self._update_agent_stats(success=False, session=session)
            return GenerateStrategyOutput(success=False, message="Failed to save generated strategy.", error_details=str(e))


        self._update_agent_stats(success=True, session=session)
        return GenerateStrategyOutput(
            success=True,
            message=f"Strategy '{mock_strategy_name}' generated and (mock) backtested successfully.",
            generated_code=mock_generated_code,
            strategy_name_suggestion=mock_strategy_name,
            backtest_summary=mock_backtest_summary,
            data={"strategy_id": new_strategy_db.id} # Return new strategy ID
        )

import asyncio # For async sleep
