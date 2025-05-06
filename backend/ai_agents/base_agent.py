# backend/ai_agents/base_agent.py
from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Type, Dict, Any, Optional, ClassVar
from sqlmodel import Session
from backend import schemas, models, crud
import json

# Generic Input and Output types for agent tasks
InputSchema = TypeVar('InputSchema', bound='AgentTaskInput')
OutputSchema = TypeVar('OutputSchema', bound='AgentTaskOutput')

class AgentTaskInput(BaseModel):
    """Base class for inputs to an agent task."""
    pass

class AgentTaskOutput(BaseModel):
    """Base class for outputs from an agent task."""
    success: bool
    message: Optional[str] = None
    error_details: Optional[str] = None
    data: Optional[Dict[str, Any]] = None # Generic data payload

class PydanticAIAgentWrapper(Generic[InputSchema, OutputSchema]):
    """
    A wrapper class for agents that aligns with pydantic-ai concepts
    but uses Genkit for LLM interactions and FastAPI for serving.
    """
    agent_model: models.Agent
    config: schemas.AgentConfigUnion
    input_schema: Type[InputSchema]
    output_schema: Type[OutputSchema]

    # To be defined by subclasses for specific LLM prompts/flows if needed
    genkit_flow_name: ClassVar[Optional[str]] = None # e.g., 'generateStrategyCodeFlow' from a Genkit flow file
    
    # TODO: Consider how tools defined in AgentConfig.enabledTools would be dynamically loaded and used.
    # This might involve a registry of available tools/functions.

    def __init__(self, agent_model: models.Agent, session: Session):
        if not agent_model.config:
            raise ValueError(f"Agent {agent_model.name} is missing configuration.")
        
        self.agent_model = agent_model
        try:
            self.config = schemas.parse_agent_config(agent_model.type.value, agent_model.config)
        except Exception as e:
            raise ValueError(f"Failed to parse configuration for agent {agent_model.name}: {e}")
        
        # Subclasses should set these appropriately
        if not hasattr(self, 'input_schema') or not hasattr(self, 'output_schema'):
            raise NotImplementedError("Subclasses must define input_schema and output_schema.")


    async def run(self, task_input: InputSchema, session: Session) -> OutputSchema:
        """
        Main method to execute the agent's primary task.
        Subclasses MUST override this.
        """
        raise NotImplementedError("The 'run' method must be implemented by subclasses.")

    def _update_agent_stats(self, success: bool, session: Session):
        """Helper to update agent's tasksCompleted or errors count."""
        if success:
            self.agent_model.tasksCompleted += 1
        else:
            self.agent_model.errors += 1
        
        session.add(self.agent_model)
        session.commit()
        session.refresh(self.agent_model)

    def log_message(self, message: str, level: str = "info"):
        """Placeholder for logging agent activity."""
        # In a real app, this would integrate with a proper logging system
        # and potentially store logs in the database linked to the agent/task.
        print(f"[{level.upper()}] Agent {self.agent_model.name}: {message}")

    @classmethod
    def get_agent_wrapper(cls, agent_id: int, session: Session) -> 'PydanticAIAgentWrapper':
        """Factory method to get a specific agent wrapper by ID."""
        db_agent = crud.get_agent(session=session, agent_id=agent_id)
        if not db_agent:
            raise ValueError(f"Agent with ID {agent_id} not found.")

        if db_agent.type == models.AgentTypeEnum.STRATEGY_CODING:
            from .strategy_coding_agent import StrategyCodingAIAgent # Local import
            return StrategyCodingAIAgent(agent_model=db_agent, session=session)
        # Add other agent types here
        # elif db_agent.type == models.AgentTypeEnum.EXECUTION:
        #     from .execution_agent import ExecutionAIAgent
        #     return ExecutionAIAgent(agent_model=db_agent, session=session)
        else:
            raise NotImplementedError(f"Agent type {db_agent.type.value} does not have a PydanticAIAgentWrapper.")

