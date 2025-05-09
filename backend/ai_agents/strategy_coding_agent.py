# backend/ai_agents/strategy_coding_agent.py
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from sqlmodel import Session
import json # For formatting JSON in prompts if needed

from .base_agent import PydanticAIAgent, AgentTaskInput, AgentTaskOutput # Import base agent components
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import crud
from backend.models import StrategyCreate, Agent
from backend.schemas import StrategyCodingAgentConfig, parse_agent_config
 
class GenerateStrategyInput(AgentTaskInput):
    market_conditions: str = Field(description="Current market conditions (e.g., bullish, bearish, volatile).")
    # risk_tolerance field in the frontend AgentConfigurationDialog uses a string enum from schema
    # Ensure this matches. schemas.AgentConfigUnion is too broad.
    # Let's assume it's a string like 'low', 'medium', 'high' from a specific enum.
    risk_tolerance: str = Field(description="User's risk tolerance level (low, medium, high).") 
    historical_data_summary: Optional[str] = Field(default=None, description="Summary of relevant historical data patterns.")
    custom_requirements: Optional[str] = Field(default=None, description="Any specific custom requirements for the strategy.")
    target_asset_class: Optional[str] = Field(default="stocks", description="Target asset class (e.g., stocks, crypto, forex).")

class GeneratedStrategyCode(BaseModel):
    """Pydantic model for the expected code output from the LLM."""
    file_name: str = Field(description="Suggested filename for the strategy (e.g., awesome_strategy.py).")
    python_code: str = Field(description="The generated Python code for the trading strategy, compatible with Lumibot.")
    description: Optional[str] = Field(default=None, description="A brief description of what the strategy does, its logic, and intended use.")

class GenerateStrategyOutput(AgentTaskOutput):
    generated_code_details: Optional[GeneratedStrategyCode] = Field(default=None, description="Details of the generated strategy code.")
    strategy_name_suggestion: Optional[str] = Field(default=None, description="A suggested name for the new strategy.")
    # backtest_summary: Optional[Dict[str, Any]] = Field(default=None, description="Placeholder for brief backtest results if done by this agent.")
    # For pydantic-ai, if backtesting is a separate step or tool, it won't be part of this LLM output.
    # Let's simplify for now and assume this agent focuses on code generation.

class StrategyCodingAIAgent(PydanticAIAgent[GenerateStrategyInput, GenerateStrategyOutput]):
    input_schema = GenerateStrategyInput
    output_schema = GenerateStrategyOutput # The direct LLM output might be GeneratedStrategyCode
 
    def __init__(self, agent_model: Agent, session: Session):
        super().__init__(agent_model, session)
        if not isinstance(self.config, StrategyCodingAgentConfig):
           # This check might be redundant if the factory/API layer ensures correct config parsing.
           # However, it's a good safeguard.
           try:
               self.config = StrategyCodingAgentConfig(
                   **agent_model.config if isinstance(agent_model.config, dict) else dict(agent_model.config)
               )
           except Exception as e:
                raise ValueError(f"Invalid configuration type for StrategyCodingAIAgent. Expected StrategyCodingAgentConfig, got {type(agent_model.config)}. Error: {e}")

        self.log_message("StrategyCodingAIAgent (pydantic-ai) initialized.")

    async def run(self, task_input: GenerateStrategyInput, session: Session) -> GenerateStrategyOutput:
        self.log_message(f"Starting strategy generation task with input: {task_input.model_dump_json(indent=2)}")

        if not self.config.llmModelProviderId or not self.config.llmModelName:
            msg = "LLM provider or model name not configured for strategy generation."
            self.log_message(msg, level="error")
            self._update_agent_stats(success=False, session=session)
            return GenerateStrategyOutput(success=False, message=msg)

        # Prepare messages for pydantic-ai Instructor
        # The generationPrompt from config is the system prompt.
        # We interpolate task_input values into it.
        
        system_prompt_template = self.config.generationPrompt
        # Basic template variable replacement (ensure these placeholders exist in the default prompt)
        system_prompt = system_prompt_template.format(
            riskTolerance=task_input.risk_tolerance,
            marketConditions=task_input.market_conditions,
            historicalData=task_input.historical_data_summary or "Not provided.",
            # Add other placeholders if your prompt uses them
            targetAssetClass=task_input.target_asset_class or "any",
            customRequirements=task_input.custom_requirements or "None."
        )
        
        # Construct a user message that encapsulates the core request if needed,
        # or rely purely on the system prompt if it's comprehensive.
        # For strategy generation, the system prompt might be enough.
        # Let's make a user message that summarizes the request.
        user_prompt_content = (
            f"Generate a Python trading strategy for the '{task_input.target_asset_class}' asset class. "
            f"Market conditions are '{task_input.market_conditions}', and my risk tolerance is '{task_input.risk_tolerance}'. "
            f"Historical data summary: {task_input.historical_data_summary or 'N/A'}. "
            f"Custom requirements: {task_input.custom_requirements or 'N/A'}. "
            "Please provide the strategy code and a brief description."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_content}
        ]
        
        self.log_message(f"Calling pydantic-ai instructor with model: {self.llm_client.model}") # Log the actual model being used

        try:
            # The response model for the LLM call itself is GeneratedStrategyCode
            llm_response: GeneratedStrategyCode = await self.instructor.chat.completions.create(
                messages=messages,
                response_model=GeneratedStrategyCode, # Expecting code and filename
                max_retries=self.config.codingRetryAttempts or 1,
            )
            
            self.log_message(f"LLM generated code for file: {llm_response.file_name}")

            # --- Post-processing: Save the generated strategy ---
            # Suggest a strategy name based on generated file name or task input
            suggested_strat_name = llm_response.file_name.replace(".py", "").replace("_", " ").title()
            if not suggested_strat_name or len(suggested_strat_name) < 3:
                suggested_strat_name = f"AI Strategy for {task_input.target_asset_class} ({task_input.risk_tolerance} risk)"
            
            strategy_description = llm_response.description or \
                                   f"AI-Generated strategy ({suggested_strat_name}) based on: {task_input.market_conditions}, risk: {task_input.risk_tolerance}."

            # TODO: Implement actual backtesting here. This could be a separate agent or tool.
            # For now, we'll skip actual backtesting within this agent's run.
            # The frontend's "Automated Generation Form" seems to imply generation AND testing.
            # If using pydantic-ai tools, a `BacktesterTool` could be invoked by the LLM if prompted.
            # Or, this agent focuses solely on generation, and another process handles backtesting.

            # For this iteration, let's assume backtesting is separate.
            # Save the strategy to the database (without PnL/WinRate from backtest yet)
            new_strategy_db = crud.create_strategy(session=session, strategy_in=models.StrategyCreate(
                name=suggested_strat_name,
                description=strategy_description,
                status='Inactive', # AI-generated strategies start as inactive for review
                source='AI-Generated',
                file_name=llm_response.file_name, # Store filename
                # pnl and win_rate will be updated after a separate backtest run
                pnl=0.0,
                win_rate=0.0,
            ))
            
            # TODO: Store the generated_code (llm_response.python_code)
            # This could be to a file system, S3, or a dedicated table/field in the DB.
            # For now, we're returning it in the output, but it also needs persistence.
            # Example: save_strategy_code_to_file(new_strategy_db.id, llm_response.file_name, llm_response.python_code)
            self.log_message(f"Simulating save of code for strategy {new_strategy_db.id} to {llm_response.file_name}")


            self._update_agent_stats(success=True, session=session)
            return GenerateStrategyOutput(
                success=True,
                message=f"Strategy '{new_strategy_db.name}' (code for {llm_response.file_name}) generated successfully. Needs backtesting.",
                generated_code_details=llm_response,
                strategy_name_suggestion=new_strategy_db.name,
                data={"strategy_id": new_strategy_db.id}
            )

        except Exception as e:
            self.log_message(f"Error during pydantic-ai LLM call or post-processing: {e}", level="error")
            self._update_agent_stats(success=False, session=session)
            return GenerateStrategyOutput(success=False, message="Failed to generate strategy code via LLM.", error_details=str(e))

# Note: asyncio.sleep is removed as pydantic-ai handles async LLM calls.
